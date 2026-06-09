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
    order_items?: (OrderItem & { menu_items?: Partial<MenuItem> })[]
}

const ORDER_SELECT = `
  id, status, total_amount, placed_at, ready_at, customer_note, payment_status, session_id,
  sessions ( id, tables ( label ) ),
  order_items ( id, quantity, menu_items ( name ) )
` as const

function tableLabel(order: WaiterOrder) {
    return (order.sessions as unknown as { tables?: { label?: string } })?.tables?.label || '?'
}

export default function WaiterOrderFeed({ initialOrders, restaurantId }: { initialOrders: WaiterOrder[]; restaurantId: string }) {
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
                        setOrders((prev) => [order, ...prev])
                        playNewOrder().catch(() => {})
                        const tbl = (order.sessions as unknown as { tables?: { label?: string } })?.tables?.label
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
                (payload) => {
                    const newStatus = payload.new.status as OrderStatus
                    if (newStatus === 'ready') {
                        playOrderReady().catch(() => {})
                        const order = ordersRef.current.find(o => o.id === payload.new.id)
                        const tbl = (order?.sessions as unknown as { tables?: { label?: string } })?.tables?.label
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
                    setOrders((prev) =>
                        prev
                            .map((o) => o.id === payload.new.id ? { ...o, status: newStatus, payment_status: payload.new.payment_status } : o)
                            .filter((o) => !['delivered', 'cancelled'].includes(o.status))
                    )
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
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
        if (res.error) toast.error(res.error)
        else toast.success(res.tableClosed ? 'Cash received — table closed ✅' : 'Cash received ✓')
        setCashProcessingId(null)
    }

    const STALE_MS = 15 * 60 * 1000
    const isStale = (order: WaiterOrder) => {
        const ts = (order as unknown as { ready_at?: string | null }).ready_at || order.placed_at
        return now - new Date(ts).getTime() > STALE_MS
    }

    const readyOrders = orders.filter((o) => o.status === 'ready')
    const preparingOrders = orders.filter((o) => o.status === 'preparing')
    const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed')

    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <ChefHat size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No active orders right now</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Package size={15} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900 text-sm">Active Orders</h2>
                {readyOrders.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full animate-pulse">
                        {readyOrders.length} ready!
                    </span>
                )}
            </div>

            {/* Ready — most urgent */}
            {readyOrders.map((order) => {
                const stale = isStale(order)
                return (
                    <div key={order.id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${stale ? 'border-red-300' : 'border-emerald-300'}`}>
                        <div className={`px-4 py-2.5 flex items-center justify-between ${stale ? 'bg-red-50' : 'bg-emerald-50'}`}>
                            <div className="flex items-center gap-2">
                                <Package size={14} className={stale ? 'text-red-500' : 'text-emerald-600'} />
                                <span className={`font-bold text-sm ${stale ? 'text-red-700' : 'text-emerald-700'}`}>
                                    Table {tableLabel(order)} — READY
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {stale && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">⚠ Getting cold!</span>}
                                <span className="text-[10px] text-gray-400">{timeAgo(order.placed_at)}</span>
                            </div>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                            <ul className="text-sm text-gray-700 space-y-0.5">
                                {order.order_items?.map((item) => (
                                    <li key={item.id} className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-semibold text-gray-400 tabular-nums">{item.quantity}×</span>
                                        <span>{item.menu_items?.name}</span>
                                    </li>
                                ))}
                            </ul>
                            {order.customer_note && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg">
                                    "{order.customer_note}"
                                </p>
                            )}
                            <div className="flex items-center justify-between pt-1 gap-2">
                                <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(order.total_amount)}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleCashAndDeliver(order.id)}
                                        disabled={!!cashProcessingId || !!processingId}
                                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 disabled:opacity-50 transition"
                                    >
                                        {cashProcessingId === order.id ? <Loader2 size={13} className="animate-spin" /> : <Banknote size={13} />}
                                        Cash
                                    </button>
                                    <button
                                        onClick={() => handleMarkDelivered(order.id)}
                                        disabled={!!processingId || !!cashProcessingId}
                                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 disabled:opacity-50 transition"
                                    >
                                        {processingId === order.id ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
                                        Deliver
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}

            {/* Preparing + Pending — compact rows */}
            {(preparingOrders.length > 0 || pendingOrders.length > 0) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {preparingOrders.map((order, i) => (
                        <div key={order.id} className={`px-4 py-3 flex items-center gap-3 ${i < preparingOrders.length - 1 || pendingOrders.length > 0 ? 'border-b border-gray-50' : ''}`}>
                            <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-800">Table {tableLabel(order)}</span>
                                    <span className="text-[10px] text-gray-400">{timeAgo(order.placed_at)}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                    {order.order_items?.map(i => `${i.quantity}× ${i.menu_items?.name}`).join(', ')}
                                </p>
                            </div>
                            <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg shrink-0">Preparing</span>
                        </div>
                    ))}
                    {pendingOrders.map((order, i) => (
                        <div key={order.id} className={`px-4 py-3 flex items-center gap-3 ${i < pendingOrders.length - 1 ? 'border-b border-gray-50' : ''}`}>
                            <div className="w-2 h-2 rounded-full bg-amber-300 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-800">Table {tableLabel(order)}</span>
                                    <span className="text-[10px] text-gray-400">{timeAgo(order.placed_at)}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                    {order.order_items?.map(i => `${i.quantity}× ${i.menu_items?.name}`).join(', ')}
                                </p>
                            </div>
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg shrink-0">Pending</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
