'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { completeTakeoutOrder } from '@/app/api/takeout/actions'
import { formatCurrency } from '@/lib/utils'
import type { TakeoutOrder } from '@/types/database'
import { Phone, User, Clock, CreditCard } from 'lucide-react'
import { playOrderReady } from '@/lib/audio'

interface Props {
    initialOrders: TakeoutOrder[]
    restaurantId: string
}

export default function WaiterTakeoutFeed({ initialOrders, restaurantId }: Props) {
    const [orders, setOrders] = useState<TakeoutOrder[]>(initialOrders)
    const [loading, setLoading] = useState<string | null>(null)

    // Real-time subscription for takeout orders that are ready for pickup
    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel(`waiter-takeout-feed-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'takeout_orders',
                    filter: `restaurant_id=eq.${restaurantId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newOrder = payload.new as TakeoutOrder
                        if (newOrder.status === 'ready_for_pickup') {
                            setOrders((prev) => [newOrder, ...prev])
                            playOrderReady().catch(() => {})
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as TakeoutOrder
                        if (updated.status === 'ready_for_pickup') {
                            setOrders((prev) => {
                                const exists = prev.find((o) => o.id === updated.id)
                                if (exists) {
                                    return prev.map((o) => (o.id === updated.id ? updated : o))
                                }
                                playOrderReady().catch(() => {})
                                return [updated, ...prev]
                            })
                        } else {
                            // Order moved past ready — remove from feed
                            setOrders((prev) => prev.filter((o) => o.id !== updated.id))
                        }
                    }
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    async function handleComplete(orderId: string) {
        setLoading(orderId)
        const result = await completeTakeoutOrder(orderId)
        if (!result.error) {
            setOrders((prev) => prev.filter((o) => o.id !== orderId))
        }
        setLoading(null)
    }

    if (orders.length === 0) {
        return null // Don't show section if no ready takeout orders
    }

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                🥡 Takeout Pickups ({orders.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                {orders.map((order) => {
                    const items = (order.items as Array<{ name: string; quantity: number }>) || []
                    return (
                        <div key={order.id} className="bg-white rounded-xl border border-green-200 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm font-bold text-gray-900">
                                    #{order.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                                    Ready for Pickup
                                </span>
                            </div>

                            <div className="space-y-1 text-sm mb-3">
                                <div className="flex items-center gap-1.5 text-gray-700">
                                    <User size={14} />
                                    <span className="font-medium">{order.customer_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    <Phone size={14} />
                                    <span>{order.customer_phone}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    <Clock size={14} />
                                    <span>Pickup: {new Date(order.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            <ul className="text-sm text-gray-600 space-y-0.5 mb-3 border-t border-gray-100 pt-2">
                                {items.map((item, idx) => (
                                    <li key={idx}>{item.quantity}× {item.name}</li>
                                ))}
                            </ul>

                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900">
                                    {formatCurrency(order.total_amount)}
                                </span>
                                <button
                                    onClick={() => handleComplete(order.id)}
                                    disabled={loading === order.id}
                                    className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-70"
                                >
                                    {loading === order.id ? '...' : (
                                        <>
                                            <CreditCard size={14} />
                                            <span>Paid &amp; Collected</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
