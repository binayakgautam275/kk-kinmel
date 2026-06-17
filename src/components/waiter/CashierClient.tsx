'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markDeliveredAndCashPaid } from '@/app/(staff)/waiter/order-actions'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { Banknote, CheckCircle, ChefHat, Clock, Loader2, CreditCard, Receipt } from 'lucide-react'

type OrderItem = { quantity: number; menu_items: { name: string } | null }
type TableRef = { label?: string } | null

type UnpaidOrder = {
    id: string
    total_amount: number
    delivered_at: string | null
    payment_status: string
    payment_method: string | null
    session_id: string | null
    sessions: { id: string; tables: TableRef } | null
    order_items: OrderItem[]
}

type ActiveOrder = {
    id: string
    status: string
    total_amount: number
    placed_at: string
    session_id: string | null
    sessions: { id: string; tables: TableRef } | null
}

interface Props {
    restaurantId: string
    initialUnpaid: UnpaidOrder[]
    initialActive: ActiveOrder[]
    tables: { id: string; label: string; capacity: number | null }[]
}

function tableLabel(sessions: { tables: TableRef } | null): string {
    return (sessions?.tables as { label?: string } | null)?.label ?? '?'
}

export default function CashierClient({ restaurantId, initialUnpaid, initialActive, tables }: Props) {
    const [unpaid, setUnpaid] = useState<UnpaidOrder[]>(initialUnpaid)
    const [active, setActive] = useState<ActiveOrder[]>(initialActive)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`cashier-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    const { data } = await supabase
                        .from('orders')
                        .select(`id, status, total_amount, placed_at, session_id, sessions ( id, tables ( label ) )`)
                        .eq('id', payload.new.id)
                        .single()
                    if (data) setActive(prev => [...prev, data as unknown as ActiveOrder])
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    const { id, status, payment_status } = payload.new
                    if (status === 'delivered' && payment_status === 'unpaid') {
                        // Fetch full record to show in unpaid list
                        const { data } = await supabase
                            .from('orders')
                            .select(`id, total_amount, delivered_at, payment_status, payment_method, session_id, sessions ( id, tables ( label ) ), order_items ( quantity, menu_items ( name ) )`)
                            .eq('id', id)
                            .single()
                        if (data) {
                            setUnpaid(prev => [...prev, data as unknown as UnpaidOrder])
                        }
                        setActive(prev => prev.filter(o => o.id !== id))
                    } else if (payment_status === 'paid' || status === 'cancelled') {
                        setUnpaid(prev => prev.filter(o => o.id !== id))
                        setActive(prev => prev.filter(o => o.id !== id))
                    } else {
                        setActive(prev => prev.map(o => o.id === id ? { ...o, status, total_amount: payload.new.total_amount } : o))
                    }
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    const handleCashPay = async (orderId: string) => {
        setProcessingId(orderId)
        const res = await markDeliveredAndCashPaid(orderId)
        if (res.error) toast.error(res.error)
        else {
            setUnpaid(prev => prev.filter(o => o.id !== orderId))
            toast.success('Payment collected ✓')
        }
        setProcessingId(null)
    }

    // Group unpaid by session
    const unpaidBySession = useMemo(() => {
        const groups = new Map<string, { label: string; orders: UnpaidOrder[]; total: number }>()
        for (const o of unpaid) {
            const key = o.session_id ?? o.id
            const label = tableLabel(o.sessions)
            if (!groups.has(key)) groups.set(key, { label, orders: [], total: 0 })
            const g = groups.get(key)!
            g.orders.push(o)
            g.total += o.total_amount ?? 0
        }
        return [...groups.entries()].sort(([, a], [, b]) => a.label.localeCompare(b.label))
    }, [unpaid])

    // Group active by session for the pipeline view
    const activePipeline = useMemo(() => {
        const groups = new Map<string, { label: string; orders: ActiveOrder[] }>()
        for (const o of active) {
            const key = o.session_id ?? o.id
            const label = tableLabel(o.sessions)
            if (!groups.has(key)) groups.set(key, { label, orders: [] })
            groups.get(key)!.orders.push(o)
        }
        return [...groups.entries()].sort(([, a], [, b]) => a.label.localeCompare(b.label))
    }, [active])

    const totalUnpaid = unpaid.reduce((s, o) => s + (o.total_amount ?? 0), 0)

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Counter</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Collect payments & close bills</p>
                </div>
                {unpaid.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-right">
                        <p className="text-xs text-red-500 font-semibold">{unpaid.length} unpaid bill{unpaid.length !== 1 ? 's' : ''}</p>
                        <p className="text-lg font-bold text-red-700 tabular-nums">{formatCurrency(totalUnpaid)}</p>
                    </div>
                )}
            </div>

            {/* Unpaid Bills — main cashier action */}
            <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Receipt size={14} className="text-red-400" />
                    Awaiting Payment
                    {unpaid.length > 0 && (
                        <span className="ml-1 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{unpaid.length}</span>
                    )}
                </h2>

                {unpaidBySession.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                        <CheckCircle size={32} className="mx-auto text-emerald-300 mb-2" />
                        <p className="text-sm font-medium text-gray-400">All bills settled</p>
                        <p className="text-xs text-gray-300 mt-1">No pending payments right now</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {unpaidBySession.map(([sessionKey, { label, orders: tableOrders, total }]) => (
                            <div key={sessionKey} className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-400" />
                                        <span className="font-bold text-sm text-red-800">Table {label}</span>
                                    </div>
                                    <span className="text-base font-bold text-red-700 tabular-nums">{formatCurrency(total)}</span>
                                </div>

                                <div className="px-4 py-3 space-y-3">
                                    {tableOrders.map(order => (
                                        <div key={order.id} className="flex items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-400 mb-1 font-mono">#{order.id.substring(0, 6).toUpperCase()}</p>
                                                <ul className="text-sm text-gray-700 space-y-0.5">
                                                    {order.order_items.map((item, i) => (
                                                        <li key={i} className="flex gap-1.5">
                                                            <span className="text-xs text-gray-400 tabular-nums shrink-0">{item.quantity}×</span>
                                                            <span className="truncate">{(item.menu_items as { name?: string } | null)?.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatCurrency(order.total_amount)}</span>
                                                <button
                                                    onClick={() => handleCashPay(order.id)}
                                                    disabled={processingId === order.id}
                                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 disabled:opacity-50 transition"
                                                >
                                                    {processingId === order.id ? <Loader2 size={12} className="animate-spin" /> : <Banknote size={12} />}
                                                    Cash
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {tableOrders.length > 1 && (
                                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-gray-400">{tableOrders.length} orders · table total</span>
                                        <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(total)}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Pipeline — read-only overview for cashier */}
            {activePipeline.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <ChefHat size={14} className="text-orange-400" />
                        In Pipeline
                        <span className="ml-1 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{active.length}</span>
                    </h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-50">
                            {activePipeline.map(([sessionKey, { label, orders: tableOrders }]) => {
                                const worstStatus = tableOrders.some(o => o.status === 'ready') ? 'ready'
                                    : tableOrders.some(o => o.status === 'preparing') ? 'preparing'
                                    : 'pending'
                                const statusConfig = {
                                    ready:    { dot: 'bg-emerald-500 animate-pulse', label: 'Ready',    cls: 'text-emerald-700' },
                                    preparing:{ dot: 'bg-orange-400 animate-pulse',  label: 'Cooking',  cls: 'text-orange-700' },
                                    pending:  { dot: 'bg-amber-300',                 label: 'Pending',  cls: 'text-amber-700' },
                                }
                                const sc = statusConfig[worstStatus]
                                const total = tableOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)

                                return (
                                    <div key={sessionKey} className="px-4 py-3 flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-gray-800">Table {label}</span>
                                                <span className={`text-[10px] font-semibold ${sc.cls}`}>{sc.label}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700 tabular-nums shrink-0">{formatCurrency(total)}</span>
                                        <Clock size={13} className="text-gray-300 shrink-0" />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {unpaid.length === 0 && activePipeline.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <CreditCard size={36} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-base font-semibold text-gray-400">All quiet at the counter</p>
                    <p className="text-sm text-gray-300 mt-1">No active orders or pending payments</p>
                </div>
            )}
        </div>
    )
}
