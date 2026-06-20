'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRestaurantTable } from '@/lib/realtime/useRestaurantTable'
import { updateTakeoutStatus } from '@/app/api/takeout/actions'
import { formatCurrency } from '@/lib/utils'
import type { TakeoutOrder } from '@/types/database'
import { Phone, User, CheckCircle2, XCircle, Timer } from 'lucide-react'
import { playKitchenPing } from '@/lib/audio'

interface TakeoutQueueProps {
    restaurantId: string
    initialOrders: TakeoutOrder[]
}

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
    placed: { next: 'confirmed', label: 'Confirm', color: 'bg-blue-600' },
    confirmed: { next: 'preparing', label: 'Start Prep', color: 'bg-yellow-600' },
    preparing: { next: 'ready_for_pickup', label: 'Mark Ready', color: 'bg-green-600' },
    ready_for_pickup: { next: 'picked_up', label: 'Picked Up', color: 'bg-gray-700' },
}

const STATUS_BADGE: Record<string, string> = {
    placed: 'bg-orange-100 text-orange-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-yellow-100 text-yellow-800',
    ready_for_pickup: 'bg-green-100 text-green-800',
    picked_up: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-800',
}

/** Returns a live "Due in Xm" / "Overdue Xm" string for a pickup_time */
function useCountdown(pickupTime: string) {
    const calc = useCallback(() => {
        const diff = new Date(pickupTime).getTime() - Date.now()
        const mins = Math.round(diff / 60_000)
        if (mins > 60) return { label: `Due in ${Math.floor(mins / 60)}h ${mins % 60}m`, overdue: false }
        if (mins > 0) return { label: `Due in ${mins}m`, overdue: false }
        if (mins === 0) return { label: 'Due now', overdue: false }
        return { label: `Overdue ${Math.abs(mins)}m`, overdue: true }
    }, [pickupTime])

    const [info, setInfo] = useState(() => calc())

    useEffect(() => {
        const id = setInterval(() => setInfo(calc()), 15_000) // update every 15s
        return () => clearInterval(id)
    }, [calc])

    return info
}

/** Small countdown badge rendered per order card */
function CountdownBadge({ pickupTime }: { pickupTime: string }) {
    const { label, overdue } = useCountdown(pickupTime)
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${overdue ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-800'}`}>
            <Timer size={12} />
            {label}
        </span>
    )
}

export default function TakeoutQueue({ restaurantId, initialOrders }: TakeoutQueueProps) {
    const [orders, setOrders] = useState<TakeoutOrder[]>(initialOrders)
    const [loading, setLoading] = useState<string | null>(null)

    // Real-time subscription via the shared per-restaurant channel.
    useRestaurantTable(restaurantId, 'takeout_orders', (payload) => {
        if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as TakeoutOrder, ...prev])
            playKitchenPing() // Audio alert for new takeout order
        } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
                prev.map((o) => (o.id === payload.new.id ? (payload.new as TakeoutOrder) : o))
            )
        }
    })

    async function handleStatusChange(orderId: string, newStatus: string) {
        setLoading(orderId)
        await updateTakeoutStatus(orderId, newStatus as 'confirmed' | 'preparing' | 'ready_for_pickup' | 'picked_up' | 'cancelled')
        setLoading(null)
    }

    const activeOrders = orders.filter((o) => !['picked_up', 'cancelled'].includes(o.status))
    const completedOrders = orders.filter((o) => ['picked_up', 'cancelled'].includes(o.status))

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                🥡 Takeout Orders ({activeOrders.length})
            </h2>

            {activeOrders.length === 0 && (
                <p className="text-gray-500 text-center py-8">No active takeout orders.</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeOrders.map((order) => {
                    const flow = STATUS_FLOW[order.status]
                    const items = (order.items as Array<{ name: string; quantity: number }>) || []

                    return (
                        <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-sm font-bold text-gray-900">
                                        #{order.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_BADGE[order.status] || ''}`}>
                                        {order.status.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Countdown Timer */}
                                <div className="flex items-center justify-between">
                                    <CountdownBadge pickupTime={order.pickup_time} />
                                    <span className="text-xs text-gray-400">
                                        Pickup: {new Date(order.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* Customer */}
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-700">
                                        <User size={14} />
                                        <span>{order.customer_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <Phone size={14} />
                                        <span>{order.customer_phone}</span>
                                    </div>
                                </div>

                                {/* Items */}
                                <ul className="text-sm text-gray-600 space-y-0.5 border-t border-gray-100 pt-2">
                                    {items.map((item, idx) => (
                                        <li key={idx}>{item.quantity}× {item.name}</li>
                                    ))}
                                </ul>

                                <div className="text-right font-semibold text-gray-900">
                                    {formatCurrency(order.total_amount)}
                                </div>
                            </div>

                            {/* Actions */}
                            {flow && (
                                <div className="flex border-t border-gray-100">
                                    <button
                                        onClick={() => handleStatusChange(order.id, 'cancelled')}
                                        disabled={loading === order.id}
                                        className="flex-1 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center justify-center gap-1 border-r border-gray-100"
                                    >
                                        <XCircle size={16} /> Cancel
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(order.id, flow.next)}
                                        disabled={loading === order.id}
                                        className={`flex-1 py-3 text-sm font-medium text-white flex items-center justify-center gap-1 ${flow.color}`}
                                    >
                                        {loading === order.id ? '...' : (
                                            <><CheckCircle2 size={16} /> {flow.label}</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Completed */}
            {completedOrders.length > 0 && (
                <details className="mt-8">
                    <summary className="text-sm font-medium text-gray-500 cursor-pointer">
                        Completed / Cancelled ({completedOrders.length})
                    </summary>
                    <div className="mt-3 space-y-2">
                        {completedOrders.slice(0, 20).map((order) => (
                            <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                                <span className="font-mono text-gray-500">#{order.id.slice(0, 8)}</span>
                                <span>{order.customer_name}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[order.status] || ''}`}>
                                    {order.status.replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    )
}
