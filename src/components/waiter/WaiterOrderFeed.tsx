'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markOrderDelivered, markDeliveredAndCashPaid } from '@/app/(staff)/waiter/order-actions'
import { playOrderReady, playNewOrder } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import { timeAgo, formatCurrency } from '@/lib/utils'
import { Package, ChefHat, Clock, Truck, Loader2, Banknote } from 'lucide-react'
import type { Order, OrderItem, MenuItem, Session, Table, OrderStatus } from '@/types/database'

type WaiterOrder = Order & {
    sessions?: Session & { tables?: Partial<Table> }
    order_items?: (OrderItem & {
        menu_items?: Partial<MenuItem>
    })[]
}

const ORDER_SELECT = `
  id, status, total_amount, placed_at, ready_at, customer_note, payment_status, session_id,
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
    const ordersRef = useRef(orders)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [cashProcessingId, setCashProcessingId] = useState<string | null>(null)
    const [now, setNow] = useState(() => Date.now())
    const supabaseRef = useRef(createClient())

    // Tick every 30s so aging labels stay current
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => { ordersRef.current = orders }, [orders])

    useEffect(() => {
        const supabase = supabaseRef.current
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
                        const order = data as unknown as WaiterOrder
                        setOrders((prev) => [order, ...prev])
                        playNewOrder().catch(() => {})
                        const tableLabel = (order.sessions as unknown as { tables?: { label?: string } })?.tables?.label
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-2xl rounded-xl px-4 py-3 flex items-start gap-3 border border-yellow-300`}>
                                <span className="text-xl mt-0.5">🛎️</span>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-yellow-700">New Order Placed</p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {tableLabel ? `Table ${tableLabel}` : 'Takeout'} · {formatCurrency(order.total_amount)}
                                    </p>
                                </div>
                            </div>
                        ), { duration: 5000, position: 'top-right' })
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

                    if (newStatus === 'ready') {
                        playOrderReady().catch(() => {})
                        const order = ordersRef.current.find(o => o.id === payload.new.id)
                        const tableLabel = (order?.sessions as unknown as { tables?: { label?: string } })?.tables?.label
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-2xl rounded-xl px-4 py-3 flex items-start gap-3 border-2 border-green-400`}>
                                <span className="text-xl mt-0.5">✅</span>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-green-700">Order Ready for Pickup!</p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {tableLabel ? `Table ${tableLabel}` : 'Takeout'} · {formatCurrency(payload.new.total_amount)}
                                    </p>
                                </div>
                            </div>
                        ), { duration: 8000, position: 'top-right' })
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
    }, [restaurantId])

    const handleMarkDelivered = async (orderId: string) => {
        setProcessingId(orderId)
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
        await markOrderDelivered(orderId)
        setProcessingId(null)
    }

    const handleCashAndDeliver = async (orderId: string) => {
        setCashProcessingId(orderId)
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
        const res = await markDeliveredAndCashPaid(orderId)
        if (res.error) {
            toast.error(res.error)
            setCashProcessingId(null)
        } else {
            toast.success(res.tableClosed ? 'Cash received — table closed ✅' : 'Cash received ✓')
            setCashProcessingId(null)
        }
    }

    const STALE_MS = 15 * 60 * 1000 // 15 minutes
    // Use ready_at (when kitchen marked it ready) — falls back to placed_at if missing
    const isStale = (order: WaiterOrder) => {
        const ts = (order as unknown as { ready_at?: string | null }).ready_at || order.placed_at
        return now - new Date(ts).getTime() > STALE_MS
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
            {readyOrders.map((order) => {
                const stale = isStale(order)
                return (
                <div
                    key={order.id}
                    className={`bg-white rounded-xl shadow-sm border-2 p-4 space-y-3 ${stale ? 'border-red-400 animate-pulse' : 'border-green-300'}`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package size={16} className={stale ? 'text-red-500' : 'text-green-600'} />
                            <span className={`font-bold ${stale ? 'text-red-600' : 'text-green-700'}`}>
                                Table{' '}
                                {(order.sessions as unknown as { tables?: { label?: string } })
                                    ?.tables?.label || '?'}{' '}
                                — READY
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {stale && (
                                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                    ⚠ Getting cold!
                                </span>
                            )}
                            <span className="text-xs text-gray-400">
                                {timeAgo(order.placed_at)}
                            </span>
                        </div>
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

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-600">
                            {formatCurrency(order.total_amount)}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleCashAndDeliver(order.id)}
                                disabled={!!cashProcessingId || !!processingId}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg py-2 px-3 flex items-center gap-1.5 text-sm active:scale-95 disabled:opacity-50 transition"
                                title="Deliver and collect cash payment"
                            >
                                {cashProcessingId === order.id ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <Banknote size={15} />
                                )}
                                Cash
                            </button>
                            <button
                                onClick={() => handleMarkDelivered(order.id)}
                                disabled={!!processingId || !!cashProcessingId}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg py-2 px-3 flex items-center gap-1.5 text-sm active:scale-95 disabled:opacity-50 transition"
                                title="Deliver (digital payment)"
                            >
                                {processingId === order.id ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <Truck size={15} />
                                )}
                                Deliver
                            </button>
                        </div>
                    </div>
                </div>
                )
            })}

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
