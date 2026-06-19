
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markOrderDelivered, markDeliveredAndCashPaid } from '@/app/(staff)/waiter/order-actions'
import { playOrderReady, playNewOrder } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import { timeAgo, formatCurrency } from '@/lib/utils'
import { Package, ChefHat, Loader2, Banknote, Truck, Clock, CheckCircle } from 'lucide-react'
import type { Order, OrderItem, MenuItem, Session, Table, OrderStatus } from '@/types/database'

export type WaiterOrder = Order & {
    sessions?: Session & { tables?: Partial<Table> }
    order_items?: (OrderItem & { menu_items?: Partial<MenuItem> })[]
}

const ORDER_SELECT = `
  id, status, total_amount, placed_at, ready_at, customer_note, payment_status, session_id,
  sessions ( id, tables ( label ) ),
  order_items ( id, quantity, menu_items ( name ) )
` as const

function tableLabel(order: WaiterOrder) {
    return order.sessions?.tables?.label || '?'
}

const STATUS_ORDER: Record<string, number> = { ready: 3, preparing: 2, confirmed: 1, pending: 1 }
const STALE_MS = 15 * 60 * 1000

export default function WaiterOrderFeed({ initialOrders, restaurantId }: {
    initialOrders: WaiterOrder[]
    restaurantId: string
}) {
    const [orders, setOrders] = useState<WaiterOrder[]>(initialOrders)
    const ordersRef = useRef(orders)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [cashProcessingId, setCashProcessingId] = useState<string | null>(null)
    const [now, setNow] = useState(() => Date.now())
    const supabaseRef = useRef(createClient())

    useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(i) }, [])
    useEffect(() => { ordersRef.current = orders }, [orders])

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`waiter-orders-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', payload.new.id).single()
                    if (data) {
                        const order = data as unknown as WaiterOrder
                        // Skip replayed/duplicate INSERTs (reconnect, multiple tabs,
                        // or a row already present in initialOrders).
                        if (ordersRef.current.some(o => o.id === order.id)) return
                        setOrders(prev => prev.some(o => o.id === order.id) ? prev : [order, ...prev])
                        playNewOrder().catch(() => {})
                        navigator.vibrate?.(300)
                        const tbl = order.sessions?.tables?.label
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-xl rounded-xl px-4 py-3 flex items-start gap-3 border border-amber-200`}>
                                <span className="text-xl mt-0.5">🛎️</span>
                                <div>
                                    <p className="font-bold text-sm text-amber-700">New Order</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{tbl ? `Table ${tbl}` : 'Takeout'} · {formatCurrency(order.total_amount)}</p>
                                </div>
                            </div>
                        ), { duration: 5000, position: 'top-right' })
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    const newStatus = payload.new.status as OrderStatus
                    const isTerminal = newStatus === 'delivered' || newStatus === 'cancelled'

                    // The UPDATE may be for an order we never received (created before
                    // mount, or a missed INSERT). If it's still active, fetch + insert
                    // it so a ready order can't silently bypass the feed.
                    let fetched: WaiterOrder | null = null
                    if (!isTerminal && !ordersRef.current.some(o => o.id === payload.new.id)) {
                        const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', payload.new.id).single()
                        if (data) {
                            fetched = data as unknown as WaiterOrder
                            setOrders(prev => prev.some(o => o.id === fetched!.id) ? prev : [fetched!, ...prev])
                        }
                    }

                    if (newStatus === 'ready') {
                        playOrderReady().catch(() => {})
                        navigator.vibrate?.([200, 100, 200])
                        const order = fetched ?? ordersRef.current.find(o => o.id === payload.new.id)
                        const tbl = order?.sessions?.tables?.label
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-xl rounded-xl px-4 py-3 flex items-start gap-3 border-2 border-emerald-300`}>
                                <span className="text-xl mt-0.5">✅</span>
                                <div>
                                    <p className="font-bold text-sm text-emerald-700">Ready for Pickup!</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{tbl ? `Table ${tbl}` : 'Takeout'} · {formatCurrency(payload.new.total_amount)}</p>
                                </div>
                            </div>
                        ), { duration: 8000, position: 'top-right' })
                    }
                    setOrders(prev =>
                        prev
                            .map(o => o.id === payload.new.id ? { ...o, status: newStatus, payment_status: payload.new.payment_status } : o)
                            .filter(o => !['delivered', 'cancelled'].includes(o.status))
                    )
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    const handleMarkDelivered = async (orderId: string) => {
        setProcessingId(orderId)
        setOrders(prev => prev.filter(o => o.id !== orderId))
        await markOrderDelivered(orderId)
        setProcessingId(null)
    }

    const handleCashAndDeliver = async (orderId: string) => {
        setCashProcessingId(orderId)
        setOrders(prev => prev.filter(o => o.id !== orderId))
        const res = await markDeliveredAndCashPaid(orderId)
        if (res.error) toast.error(res.error)
        else toast.success(res.tableClosed ? 'Cash received — table closed ✅' : 'Cash received ✓')
        setCashProcessingId(null)
    }

    // Sort all orders: Ready first, then Preparing, then Pending
    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const scoreA = STATUS_ORDER[a.status] ?? 0
            const scoreB = STATUS_ORDER[b.status] ?? 0
            if (scoreA !== scoreB) return scoreB - scoreA
            return new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
        })
    }, [orders])

    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <ChefHat size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No active orders right now</p>
            </div>
        )
    }

    const totalReady = orders.filter(o => o.status === 'ready').length

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <Package className="text-emerald-500" />
                    Live Orders
                    <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">{orders.length}</span>
                </h2>
                {totalReady > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-sm border border-emerald-200">
                        {totalReady} Ready
                    </span>
                )}
            </div>

            <div className="grid gap-4">
                {sortedOrders.map((order) => {
                    const label = tableLabel(order)
                    const isReady = order.status === 'ready'
                    const isPreparing = order.status === 'preparing'
                    const ts = (order as unknown as { ready_at?: string | null }).ready_at || order.placed_at
                    const isStale = now - new Date(ts).getTime() > STALE_MS

                    return (
                        <div key={order.id} className={`bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 ${isReady ? 'border-emerald-400 bg-emerald-50/10 shadow-emerald-100' : isPreparing ? 'border-amber-200' : 'border-gray-100 hover:border-gray-200'}`}>
                            <div className="p-4 md:p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-xl font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">Tbl {label}</span>
                                            <StatusPip status={order.status} />
                                            {isStale && isReady && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md animate-pulse">Cold warning!</span>}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Clock size={14} /> {timeAgo(order.placed_at)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-gray-900 block">{formatCurrency(order.total_amount)}</span>
                                        <span className="text-xs font-medium text-gray-400">{order.payment_status}</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                                    <ul className="space-y-1.5 text-sm">
                                        {order.order_items?.map(item => (
                                            <li key={item.id} className="flex gap-3 text-gray-800">
                                                <span className="font-bold text-gray-400 w-6 text-right">{item.quantity}×</span>
                                                <span className="font-medium">{item.menu_items?.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {order.customer_note && (
                                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 italic">
                                        "{order.customer_note}"
                                    </p>
                                )}

                                {isReady && (
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => handleCashAndDeliver(order.id)}
                                            disabled={!!cashProcessingId || !!processingId}
                                            className="flex-1 flex justify-center items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-sm"
                                        >
                                            {cashProcessingId === order.id ? <Loader2 size={18} className="animate-spin" /> : <Banknote size={18} />}
                                            Take Cash
                                        </button>
                                        <button
                                            onClick={() => handleMarkDelivered(order.id)}
                                            disabled={!!processingId || !!cashProcessingId}
                                            className="flex-1 flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-sm shadow-emerald-200"
                                        >
                                            {processingId === order.id ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                                            Deliver
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function StatusPip({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
        ready:     { label: 'Ready',     cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle },
        preparing: { label: 'Preparing', cls: 'text-orange-700 bg-orange-50 border-orange-200',   Icon: ChefHat },
        confirmed: { label: 'Confirmed', cls: 'text-blue-700 bg-blue-50 border-blue-200',          Icon: Clock },
        pending:   { label: 'Pending',   cls: 'text-amber-700 bg-amber-50 border-amber-200',      Icon: Clock },
    }
    const m = map[status
        
    ] || map.pending
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.cls}`}>
            <m.Icon size={9} />
            {m.label}
        </span>
    )
}
