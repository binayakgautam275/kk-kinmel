'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markOrderDelivered } from '@/app/(staff)/waiter/order-actions'
import { playKitchenPing } from '@/lib/audio'
import { timeAgo, formatCurrency } from '@/lib/utils'
import { Package, ChefHat, Clock, Truck, Loader2 } from 'lucide-react'
import type { Order, OrderItem, MenuItem, Session, Table, OrderStatus } from '@/types/database'

type WaiterOrder = Order & {
    sessions?: Session & { tables?: Partial<Table> }
    order_items?: (OrderItem & {
        menu_items?: Partial<MenuItem>
    })[]
}

const ORDER_SELECT = `
  id, status, total_amount, placed_at, customer_note, payment_status, session_id,
  sessions ( id, tables ( label ) ),
  order_items (
    id, quantity,
    menu_items ( name )
  )
` as const

export default function WaiterOrderFeed({
    initialOrders,
    restaurantId,
}: {
    initialOrders: WaiterOrder[]
    restaurantId: string
}) {
    const [orders, setOrders] = useState<WaiterOrder[]>(initialOrders)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase
            .channel(`waiter-orders-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `restaurant_id=eq.${restaurantId}`,
                },
                async (payload) => {
                    const { data } = await supabase
                        .from('orders')
                        .select(ORDER_SELECT)
                        .eq('id', payload.new.id)
                        .single()
                    if (data) {
                        setOrders((prev) => [data as unknown as WaiterOrder, ...prev])
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `restaurant_id=eq.${restaurantId}`,
                },
                (payload) => {
                    const newStatus = payload.new.status as OrderStatus

                    // Play ping when order becomes ready for pickup
                    if (newStatus === 'ready') {
                        playKitchenPing()
                    }

                    setOrders((prev) =>
                        prev
                            .map((o) =>
                                o.id === payload.new.id
                                    ? { ...o, status: newStatus, payment_status: payload.new.payment_status }
                                    : o
                            )
                            .filter(
                                (o) =>
                                    !['delivered', 'cancelled'].includes(o.status)
                            )
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [restaurantId, supabase])

    const handleMarkDelivered = async (orderId: string) => {
        setProcessingId(orderId)
        // Optimistic remove
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
        await markOrderDelivered(orderId)
        setProcessingId(null)
    }

    // Group by status — ready orders on top (most urgent for waiter)
    const readyOrders = orders.filter((o) => o.status === 'ready')
    const preparingOrders = orders.filter((o) => o.status === 'preparing')
    const pendingOrders = orders.filter(
        (o) => o.status === 'pending' || o.status === 'confirmed'
    )

    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
                <ChefHat size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">No active orders</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Package size={20} className="text-blue-600" />
                Active Orders
                {readyOrders.length > 0 && (
                    <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                        {readyOrders.length} ready for delivery
                    </span>
                )}
            </h2>

            {/* Ready Orders — top priority, highlighted */}
            {readyOrders.map((order) => (
                <div
                    key={order.id}
                    className="bg-white rounded-xl shadow-sm border-2 border-green-300 p-4 space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package size={16} className="text-green-600" />
                            <span className="font-bold text-green-700">
                                Table{' '}
                                {(order.sessions as unknown as { tables?: { label?: string } })
                                    ?.tables?.label || '?'}{' '}
                                — READY
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">
                            {timeAgo(order.placed_at)}
                        </span>
                    </div>

                    <ul className="text-sm text-gray-700 space-y-1">
                        {order.order_items?.map((item) => (
                            <li key={item.id}>
                                {item.quantity}x {item.menu_items?.name}
                            </li>
                        ))}
                    </ul>

                    {order.customer_note && (
                        <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded-md border border-yellow-200">
                            Note: {order.customer_note}
                        </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm font-medium text-gray-600">
                            {formatCurrency(order.total_amount)}
                        </span>
                        <button
                            onClick={() => handleMarkDelivered(order.id)}
                            disabled={processingId === order.id}
                            className="bg-green-600 text-white font-medium rounded-lg py-2.5 px-4 flex items-center gap-1.5 text-sm active:scale-95 disabled:opacity-50"
                        >
                            {processingId === order.id ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Truck size={16} />
                            )}
                            Mark Delivered
                        </button>
                    </div>
                </div>
            ))}

            {/* Preparing Orders */}
            {preparingOrders.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-orange-600 flex items-center gap-1.5">
                        <ChefHat size={14} /> Preparing ({preparingOrders.length})
                    </h3>
                    {preparingOrders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white rounded-lg border border-orange-200 p-3 flex items-center justify-between"
                        >
                            <div>
                                <span className="font-medium text-gray-900">
                                    Table{' '}
                                    {(order.sessions as unknown as { tables?: { label?: string } })
                                        ?.tables?.label || '?'}
                                </span>
                                <span className="text-xs text-gray-400 ml-2">
                                    {timeAgo(order.placed_at)}
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {order.order_items
                                        ?.map(
                                            (i) =>
                                                `${i.quantity}x ${i.menu_items?.name}`
                                        )
                                        .join(', ')}
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                Preparing
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-yellow-600 flex items-center gap-1.5">
                        <Clock size={14} /> Pending ({pendingOrders.length})
                    </h3>
                    {pendingOrders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white rounded-lg border border-yellow-200 p-3 flex items-center justify-between"
                        >
                            <div>
                                <span className="font-medium text-gray-900">
                                    Table{' '}
                                    {(order.sessions as unknown as { tables?: { label?: string } })
                                        ?.tables?.label || '?'}
                                </span>
                                <span className="text-xs text-gray-400 ml-2">
                                    {timeAgo(order.placed_at)}
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {order.order_items
                                        ?.map(
                                            (i) =>
                                                `${i.quantity}x ${i.menu_items?.name}`
                                        )
                                        .join(', ')}
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                Pending
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
