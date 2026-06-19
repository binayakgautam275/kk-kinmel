
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markOrderDelivered, markDeliveredAndCashPaid } from '@/app/(staff)/waiter/order-actions'
import { playOrderReady, playNewOrder } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import { timeAgo, formatCurrency } from '@/lib/utils'
import { Package, ChefHat, Loader2, Banknote, Truck, Clock, CheckCircle } from 'lucide-react'
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
                        setOrders(prev => [order, ...prev])
                        playNewOrder().catch(() => {})
                        navigator.vibrate?.(300)
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
                        navigator.vibrate?.([200, 100, 200])
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

    // Group orders by session/table
    const tableGroups = useMemo(() => {
        const groups = new Map<string, { label: string; orders: WaiterOrder[] }>()
        for (const order of orders) {
            const key = order.session_id || order.id
            const label = tableLabel(order)
            if (!groups.has(key)) groups.set(key, { label, orders: [] })
            groups.get(key)!.orders.push(order)
        }
        // Sort groups: ready first, then preparing, then pending
        return [...groups.entries()].sort(([, a], [, b]) => {
            const score = (orders: WaiterOrder[]) => Math.max(...orders.map(o => STATUS_ORDER[o.status] ?? 0))
            return score(b.orders) - score(a.orders)
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
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Package size={15} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900 text-sm">
                    Active Orders
                    <span className="ml-2 text-gray-400 font-normal">{tableGroups.length} table{tableGroups.length !== 1 ? 's' : ''}</span>
                </h2>
                {totalReady > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full animate-pulse">
                        {totalReady} ready!
                    </span>
                )}
            </div>

            {tableGroups.map(([sessionKey, { label, orders: tableOrders }]) => {
                const hasReady = tableOrders.some(o => o.status === 'ready')
                const hasPreparing = tableOrders.some(o => o.status === 'preparing')
                const sorted = [...tableOrders].sort((a, b) => (STATUS_ORDER[b.status] ?? 0) - (STATUS_ORDER[a.status] ?? 0))

                const headerBg = hasReady ? 'bg-emerald-50 border-emerald-300' : hasPreparing ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'
                const headerText = hasReady ? 'text-emerald-700' : hasPreparing ? 'text-orange-700' : 'text-amber-700'
                const dotColor = hasReady ? 'bg-emerald-500 animate-pulse' : hasPreparing ? 'bg-orange-400' : 'bg-amber-300'

                return (
                    <div key={sessionKey} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${hasReady ? 'border-emerald-300' : hasPreparing ? 'border-orange-200' : 'border-amber-100'}`}>
                        {/* Table header */}
                        <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${headerBg}`}>
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                            <span className={`font-bold text-sm ${headerText}`}>Table {label}</span>
                            <span className={`text-[10px] font-semibold ml-1 ${headerText} opacity-70`}>
                                {hasReady ? '— READY' : hasPreparing ? '— Preparing' : '— Pending'}
                            </span>
                            <span className="ml-auto text-[10px] text-gray-400">
                                {sorted.length} order{sorted.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Orders in this table */}
                        <div className="divide-y divide-gray-50">
                            {sorted.map((order, idx) => {
                                const ts = (order as unknown as { ready_at?: string | null }).ready_at || order.placed_at
                                const isStale = now - new Date(ts).getTime() > STALE_MS
                                const isReady = order.status === 'ready'

                                return (
                                    <div key={order.id} className={`px-4 py-3 ${isReady ? 'bg-emerald-50/30' : ''}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <StatusPip status={order.status} />
                                            <span className="text-xs text-gray-500">{timeAgo(order.placed_at)}</span>
                                            {isStale && isReady && (
                                                <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">⚠ Getting cold!</span>
                                            )}
                                            <span className="ml-auto text-xs font-semibold text-gray-700 tabular-nums">{formatCurrency(order.total_amount)}</span>
                                        </div>

                                        <ul className="text-sm text-gray-700 space-y-0.5 mb-2">
                                            {order.order_items?.map(item => (
                                                <li key={item.id} className="flex items-baseline gap-1.5">
                                                    <span className="text-xs font-semibold text-gray-400 tabular-nums shrink-0">{item.quantity}×</span>
                                                    <span className="truncate">{item.menu_items?.name}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {order.customer_note && (
                                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg mb-2">
                                                "{order.customer_note}"
                                            </p>
                                        )}

                                        {isReady && (
                                            <div className="flex gap-2 pt-1">
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
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
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
