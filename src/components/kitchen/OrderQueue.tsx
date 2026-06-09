'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playNewOrder } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { Clock, ChefHat, CheckCircle2, CheckSquare } from 'lucide-react'
import type { OrderStatus, Order, OrderItem, OrderItemModifier, MenuItem, Session, Table } from '@/types/database'
import { updateOrderStatus } from '@/app/(staff)/kitchen/actions'

export type KitchenOrder = Order & {
    sessions?: Session & { tables?: Partial<Table> }
    order_items?: (OrderItem & {
        menu_items?: Partial<MenuItem>
        order_item_modifiers?: Partial<OrderItemModifier>[]
    })[]
}

const ORDER_SELECT = `
  id, status, total_amount, placed_at, customer_note,
  sessions ( tables ( label ) ),
  order_items (
    id, quantity, special_request,
    menu_items ( name ),
    order_item_modifiers ( modifier_name, price_adjustment )
  )
` as const

export default function OrderQueue({ initialOrders, restaurantId }: {
    initialOrders: KitchenOrder[]
    restaurantId: string
}) {
    const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders)
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`kitchen-queue-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', payload.new.id).single()
                    if (data) {
                        const order = data as unknown as KitchenOrder
                        setOrders(prev => [...prev, order])
                        playNewOrder().catch(() => {})
                        const tbl = order.sessions?.tables?.label
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full shadow-2xl rounded-xl px-4 py-3 flex items-start gap-3 border border-yellow-500/30`}
                                 style={{ background: '#1a1d27' }}>
                                <span className="text-xl mt-0.5">🔔</span>
                                <div>
                                    <p className="font-bold text-sm text-yellow-400">New Order!</p>
                                    <p className="text-xs text-white/40 mt-0.5">{tbl ? `Table ${tbl}` : 'Takeout'} · {formatCurrency(order.total_amount)}</p>
                                </div>
                            </div>
                        ), { duration: 6000, position: 'top-right' })
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const newStatus = payload.new.status as string
                    if (newStatus === 'delivered' || newStatus === 'cancelled') {
                        setOrders(prev => prev.filter(o => o.id !== payload.new.id))
                    } else {
                        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: payload.new.status } : o))
                    }
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    const updateStatus = async (orderId: string, currentStatus: string) => {
        let nextStatus: OrderStatus = 'preparing'
        if (currentStatus === 'pending' || currentStatus === 'confirmed') nextStatus = 'preparing'
        else if (currentStatus === 'preparing') nextStatus = 'ready'
        else return
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
        await updateOrderStatus(orderId, nextStatus)
    }

    const { newOrders, preparingOrders, readyOrders } = useMemo(() => {
        const sorted = [...orders].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime())
        return {
            newOrders:      sorted.filter(o => o.status === 'pending' || o.status === 'confirmed'),
            preparingOrders:sorted.filter(o => o.status === 'preparing'),
            readyOrders:    sorted.filter(o => o.status === 'ready'),
        }
    }, [orders])

    const [activeTab, setActiveTab] = useState<'new' | 'preparing' | 'pass'>('new')

    const COLS = [
        {
            key: 'new' as const,
            label: 'New Orders',
            icon: Clock,
            color: '#f59e0b',
            borderColor: 'rgba(245,158,11,0.25)',
            bgColor: 'rgba(245,158,11,0.08)',
            orders: newOrders,
            actionLabel: 'Start Preparing',
            emptyLabel: 'Queue is empty',
        },
        {
            key: 'preparing' as const,
            label: 'Preparing',
            icon: ChefHat,
            color: '#f97316',
            borderColor: 'rgba(249,115,22,0.25)',
            bgColor: 'rgba(249,115,22,0.08)',
            orders: preparingOrders,
            actionLabel: 'Mark as Ready',
            emptyLabel: 'Nothing cooking',
        },
        {
            key: 'pass' as const,
            label: 'Pass',
            icon: CheckCircle2,
            color: '#10b981',
            borderColor: 'rgba(16,185,129,0.25)',
            bgColor: 'rgba(16,185,129,0.08)',
            orders: readyOrders,
            actionLabel: undefined,
            emptyLabel: 'Pass is clear ✓',
            readOnly: true,
        },
    ]

    return (
        <div className="h-full flex flex-col" style={{ background: '#0f1117' }}>
            {/* Mobile tab bar */}
            <div className="flex md:hidden gap-2 px-3 pt-3 pb-2 shrink-0">
                {COLS.map(col => {
                    const Icon = col.icon
                    const isActive = activeTab === col.key
                    return (
                        <button
                            key={col.key}
                            onClick={() => setActiveTab(col.key)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border"
                            style={isActive
                                ? { background: col.bgColor, borderColor: col.borderColor, color: col.color }
                                : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }
                            }
                        >
                            <Icon size={13} />
                            {col.label.split(' ')[0]}
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                  style={{ background: 'rgba(255,255,255,0.1)', color: isActive ? col.color : 'rgba(255,255,255,0.3)' }}>
                                {col.orders.length}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Columns */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-3 md:p-5 gap-3 md:gap-5">
                {COLS.map(col => {
                    const Icon = col.icon
                    const isVisible = activeTab === col.key
                    return (
                        <div key={col.key}
                             className={`flex-none w-full md:w-[340px] lg:w-[380px] flex flex-col gap-3 ${isVisible ? 'flex' : 'hidden md:flex'}`}>
                            {/* Column header — desktop only */}
                            <div className="hidden md:flex items-center justify-between pb-3 border-b border-white/[0.07]">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                         style={{ background: col.bgColor }}>
                                        <Icon size={15} style={{ color: col.color }} />
                                    </div>
                                    <h2 className="font-bold text-white/80">{col.label}</h2>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                          style={{ background: col.bgColor, color: col.color }}>
                                        {col.orders.length}
                                    </span>
                                </div>
                                {col.key === 'pass' && col.orders.length > 0 && (
                                    <span className="text-[10px] text-white/30">Awaiting waiter</span>
                                )}
                            </div>

                            {/* Tickets */}
                            <div className="flex-1 overflow-y-auto space-y-3 pb-6"
                                 style={{ scrollbarWidth: 'none' }}>
                                {col.orders.map(order => (
                                    <OrderTicket
                                        key={order.id}
                                        order={order}
                                        onAction={!col.readOnly ? () => updateStatus(order.id, order.status) : undefined}
                                        actionLabel={col.actionLabel}
                                        accentColor={col.color}
                                        borderColor={col.borderColor}
                                        bgColor={col.bgColor}
                                        readOnly={col.readOnly}
                                    />
                                ))}
                                {col.orders.length === 0 && (
                                    <div className="text-center py-12">
                                        <Icon size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
                                        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>{col.emptyLabel}</p>
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

function OrderTicket({ order, onAction, actionLabel, accentColor, borderColor, bgColor, readOnly }: {
    order: KitchenOrder
    onAction?: () => void
    actionLabel?: string
    accentColor: string
    borderColor: string
    bgColor: string
    readOnly?: boolean
}) {
    const tbl = order.sessions?.tables?.label || '?'
    const [now, setNow] = useState(Date.now)
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30_000)
        return () => clearInterval(t)
    }, [])

    const ageMs = now - new Date(order.placed_at).getTime()
    const isOld = ageMs > 15 * 60 * 1000
    const ageMin = Math.floor(ageMs / 60000)

    return (
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor, background: '#161820' }}>
            {/* Ticket header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b"
                 style={{ borderColor, background: bgColor }}>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                    <span className="font-bold text-white/90">Table {tbl}</span>
                </div>
                <span className={`text-xs font-mono font-semibold tabular-nums ${isOld && !readOnly ? 'text-red-400 animate-pulse' : ''}`}
                      style={{ color: isOld && !readOnly ? undefined : 'rgba(255,255,255,0.35)' }}>
                    {ageMin > 0 ? `${ageMin}m` : timeAgo(order.placed_at)}
                    {isOld && !readOnly && ' ⚠'}
                </span>
            </div>

            {/* Items */}
            <div className="p-4 space-y-2.5">
                {order.order_items?.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5">
                        <span className="font-bold text-sm w-6 shrink-0 tabular-nums mt-0.5" style={{ color: accentColor }}>
                            {item.quantity}×
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white/90 text-[15px] leading-snug">{item.menu_items?.name}</p>
                            {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                                <p className="text-xs text-white/35 mt-0.5">
                                    {item.order_item_modifiers.map((m, i) => (
                                        <span key={i}>{m.modifier_name}{i < (item.order_item_modifiers?.length ?? 0) - 1 ? ', ' : ''}</span>
                                    ))}
                                </p>
                            )}
                            {item.special_request && (
                                <p className="text-xs text-yellow-400/80 italic mt-0.5 font-medium">↳ {item.special_request}</p>
                            )}
                        </div>
                    </div>
                ))}

                {order.customer_note && (
                    <div className="mt-3 px-3 py-2 rounded-xl border border-yellow-500/20 text-yellow-400/80 text-xs"
                         style={{ background: 'rgba(245,158,11,0.06)' }}>
                        <span className="font-bold text-[9px] uppercase tracking-widest block mb-0.5 text-yellow-500/60">Note</span>
                        {order.customer_note}
                    </div>
                )}

                <div className="pt-2">
                    {readOnly ? (
                        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/20 text-emerald-400/70 text-sm font-semibold"
                             style={{ background: 'rgba(16,185,129,0.06)' }}>
                            <CheckCircle2 size={15} /> Ready — awaiting pickup
                        </div>
                    ) : (
                        <button
                            onClick={onAction}
                            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 border"
                            style={{ background: bgColor, borderColor, color: accentColor }}
                        >
                            <CheckSquare size={16} />
                            {actionLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
