'use client'

import { useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRestaurantTable } from '@/lib/realtime/useRestaurantTable'
import { playNewOrder } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { Clock, ChefHat, CheckCircle2, CheckSquare, ListOrdered, Printer, LayoutPanelLeft } from 'lucide-react'
import type { OrderStatus, Order, OrderItem, OrderItemModifier, MenuItem, Session, Table } from '@/types/database'
import { updateOrderStatus } from '@/app/(staff)/kitchen/actions'
import { AgingTimer, EmptyState } from '@/components/ui'

export type KitchenOrder = Order & {
    sessions?: Session & { tables?: Partial<Table> }
    order_items?: (OrderItem & {
        menu_item_id?: string
        menu_items?: Partial<MenuItem>
        order_item_modifiers?: Partial<OrderItemModifier>[]
    })[]
}

const ORDER_SELECT = `
  id, status, total_amount, placed_at, customer_note,
  sessions ( tables ( label ) ),
  order_items (
    id, menu_item_id, quantity, special_request,
    menu_items ( id, name, is_combo ),
    order_item_modifiers ( modifier_name, price_adjustment )
  )
` as const

export default function OrderQueue({ initialOrders, restaurantId, comboItems = [] }: {
    initialOrders: KitchenOrder[]
    restaurantId: string
    comboItems?: any[]
}) {
    const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders)
    const supabaseRef = useRef(createClient())

    // Live order changes via the shared per-restaurant channel.
    useRestaurantTable(restaurantId, 'orders', async (payload) => {
        if (payload.eventType === 'INSERT') {
            const supabase = supabaseRef.current
            const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', payload.new.id).single()
            if (!data) return
            const order = data as unknown as KitchenOrder
            // Realtime can replay an INSERT (reconnect, multiple tabs) or
            // deliver one already present in initialOrders — guard against
            // duplicate rows and duplicate React keys.
            let isNew = false
            setOrders(prev => {
                if (prev.some(o => o.id === order.id)) return prev
                isNew = true
                return [...prev, order]
            })
            if (!isNew) return
            playNewOrder().catch(() => {})
            const tbl = order.sessions?.tables?.label
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full shadow-2xl rounded-card px-4 py-3 flex items-start gap-3 border border-yellow-500/30`}
                     style={{ background: '#1a1d27' }}>
                    <span className="text-xl mt-0.5">🔔</span>
                    <div>
                        <p className="font-bold text-sm text-yellow-400">New Order!</p>
                        <p className="text-xs text-dark-muted mt-0.5">{tbl ? `Table ${tbl}` : 'Takeout'} · {formatCurrency(order.total_amount)}</p>
                    </div>
                </div>
            ), { duration: 6000, position: 'top-right' })
        } else if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new.status as string
            if (newStatus === 'delivered' || newStatus === 'cancelled') {
                setOrders(prev => prev.filter(o => o.id !== payload.new.id))
            } else {
                setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: payload.new.status } : o))
            }
        }
    })

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

    const tocItems = useMemo(() => {
        const items = [...newOrders, ...preparingOrders].flatMap(o => o.order_items || [])
        const grouped = new Map<string, {
            name: string,
            quantity: number,
            modifiers: string,
            special_request: string | null,
            constituents?: { name: string; quantity: number }[]
        }>()

        for (const item of items) {
            if (!item.menu_items?.name) continue
            
            const mods = (item.order_item_modifiers || [])
                .map(m => m.modifier_name)
                .sort()
                .join(', ')
            
            const key = `${item.menu_items.name}|${mods}|${item.special_request || ''}`
            
            // Resolve constituents if it is a combo
            const constituents = item.menu_items?.is_combo
                ? comboItems
                    .filter(c => c.combo_id === item.menu_item_id)
                    .map(c => ({
                        name: c.menu_items?.name || 'Item',
                        quantity: c.quantity
                    }))
                : undefined
            
            if (!grouped.has(key)) {
                grouped.set(key, {
                    name: item.menu_items.name,
                    quantity: item.quantity,
                    modifiers: mods,
                    special_request: item.special_request,
                    constituents: constituents ? constituents.map(c => ({ ...c, quantity: c.quantity * item.quantity })) : undefined
                })
            } else {
                const entry = grouped.get(key)!
                entry.quantity += item.quantity
                if (entry.constituents && constituents) {
                    entry.constituents = entry.constituents.map(c => {
                        const match = constituents.find(mc => mc.name === c.name)
                        return match ? { ...c, quantity: c.quantity + (match.quantity * item.quantity) } : c
                    })
                }
            }
        }

        return Array.from(grouped.values()).sort((a, b) => b.quantity - a.quantity)
    }, [newOrders, preparingOrders, comboItems])

    const [activeTab, setActiveTab] = useState<'new' | 'preparing' | 'pass' | 'toc'>('new')
    const [showTOCDesktop, setShowTOCDesktop] = useState(false)

    // Column accents follow the canonical status map: New=warning (amber),
    // Preparing=info (blue — never brand orange for status), Pass=success (green).
    const COLS = [
        {
            key: 'new' as const,
            label: 'New Orders',
            icon: Clock,
            color: 'var(--warning)',
            borderColor: 'color-mix(in srgb, var(--warning) 28%, transparent)',
            bgColor: 'color-mix(in srgb, var(--warning) 12%, transparent)',
            orders: newOrders,
            actionLabel: 'Start Preparing',
            emptyLabel: 'Queue is empty',
        },
        {
            key: 'preparing' as const,
            label: 'Preparing',
            icon: ChefHat,
            color: 'var(--info)',
            borderColor: 'color-mix(in srgb, var(--info) 28%, transparent)',
            bgColor: 'color-mix(in srgb, var(--info) 12%, transparent)',
            orders: preparingOrders,
            actionLabel: 'Mark as Ready',
            emptyLabel: 'Nothing cooking',
        },
        {
            key: 'pass' as const,
            label: 'Pass',
            icon: CheckCircle2,
            color: 'var(--success)',
            borderColor: 'color-mix(in srgb, var(--success) 28%, transparent)',
            bgColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
            orders: readyOrders,
            actionLabel: undefined,
            emptyLabel: 'Pass is clear ✓',
            readOnly: true,
        },
    ]

    return (
        <div className="h-full flex flex-col bg-dark-bg print:bg-white print:text-black">
            {/* Mobile tab bar */}
            <div className="flex md:hidden gap-2 px-3 pt-3 pb-2 shrink-0 print:hidden">
                {COLS.map(col => {
                    const Icon = col.icon
                    const isActive = activeTab === col.key
                    return (
                        <button
                            key={col.key}
                            onClick={() => setActiveTab(col.key)}
                            className="flex-1 py-2.5 rounded-card text-xs font-bold flex items-center justify-center gap-1.5 transition-all border"
                            style={isActive
                                ? { background: col.bgColor, borderColor: col.borderColor, color: col.color }
                                : { background: 'var(--dark-surface)', borderColor: 'var(--dark-border)', color: 'var(--dark-muted)' }
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
                <button
                    onClick={() => setActiveTab('toc')}
                    className="flex-1 py-2.5 rounded-card text-xs font-bold flex items-center justify-center gap-1.5 transition-all border"
                    style={activeTab === 'toc'
                        ? { background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6' }
                        : { background: 'var(--dark-surface)', borderColor: 'var(--dark-border)', color: 'var(--dark-muted)' }
                    }
                >
                    <ListOrdered size={13} />
                    TOC
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Columns Container */}
                <div className={`flex-1 overflow-hidden flex flex-col md:flex-row p-3 md:p-5 gap-3 md:gap-5 print:hidden ${activeTab === 'toc' ? 'hidden md:flex' : 'flex'}`}>

                {COLS.map(col => {
                    const Icon = col.icon
                    const isVisible = activeTab === col.key
                    return (
                        <div key={col.key}
                             className={`flex-none w-full md:w-[340px] lg:w-[380px] flex flex-col gap-3 ${isVisible ? 'flex' : 'hidden md:flex'}`}>
                            {/* Column header — desktop only */}
                            <div className="hidden md:flex items-center justify-between pb-3 border-b border-dark-border">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center"
                                         style={{ background: col.bgColor }}>
                                        <Icon size={15} style={{ color: col.color }} />
                                    </div>
                                    <h2 className="font-bold text-dark-ink">{col.label}</h2>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                          style={{ background: col.bgColor, color: col.color }}>
                                        {col.orders.length}
                                    </span>
                                </div>
                                {col.key === 'pass' && (
                                    <div className="flex items-center gap-3">
                                        {col.orders.length > 0 && (
                                            <span className="text-[10px] text-dark-muted">Awaiting waiter</span>
                                        )}
                                        <button
                                            onClick={() => setShowTOCDesktop(!showTOCDesktop)}
                                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--r-md)] text-xs font-bold border transition-colors"
                                            style={{ 
                                                background: showTOCDesktop ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                                                borderColor: showTOCDesktop ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)',
                                                color: showTOCDesktop ? '#60a5fa' : 'rgba(255,255,255,0.6)'
                                            }}
                                        >
                                            <LayoutPanelLeft size={13} />
                                            {showTOCDesktop ? 'Hide TOC' : 'Show TOC'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Tickets */}
                            <div className="flex-1 overflow-y-auto space-y-3 pb-6"
                                 style={{ scrollbarWidth: 'none' }}>
                                {col.orders.map(order => (
                                    <OrderTicket
                                        key={order.id}
                                        order={order}
                                        comboItems={comboItems}
                                        onAction={!col.readOnly ? () => updateStatus(order.id, order.status) : undefined}
                                        actionLabel={col.actionLabel}
                                        accentColor={col.color}
                                        borderColor={col.borderColor}
                                        bgColor={col.bgColor}
                                        readOnly={col.readOnly}
                                    />
                                ))}
                                {col.orders.length === 0 && (
                                    <EmptyState dark icon={Icon} title={col.emptyLabel} />
                                )}
                            </div>
                        </div>
                    )
                })}
                </div>

                {/* TOC Sidebar / Panel */}
                <div 
                    className={`flex flex-col h-full shrink-0 border-dark-border print:w-full print:border-none ${activeTab === 'toc' ? 'block w-full' : (showTOCDesktop ? 'hidden md:flex md:w-[320px] lg:w-[360px] md:border-l' : 'hidden')} print:block`}
                >
                    <div className="flex items-center justify-between p-4 border-b border-dark-border shrink-0 print:border-black/10 print:pb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center bg-blue-500/10 print:hidden">
                                <ListOrdered size={15} className="text-blue-500" />
                            </div>
                            <h2 className="font-bold text-dark-ink print:text-black print:text-xl">Consolidated (TOC)</h2>
                        </div>
                        <button onClick={() => window.print()} className="p-2 hover:bg-white/5 rounded-[var(--r-md)] text-dark-muted transition print:hidden">
                            <Printer size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 print:space-y-1 print:p-0 print:pt-4" style={{ scrollbarWidth: 'none' }}>
                        {tocItems.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-card border border-dark-border bg-dark-surface print:border-black/10 print:bg-transparent print:p-2 print:rounded-none">
                                <span className="font-extrabold text-lg w-8 shrink-0 tabular-nums mt-0.5 text-blue-400 print:text-black">
                                    {item.quantity}×
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-dark-ink text-[15px] leading-snug print:text-black">{item.name}</p>
                                    {item.modifiers && (
                                        <p className="text-xs text-dark-muted mt-0.5 print:text-black/60">{item.modifiers}</p>
                                    )}
                                    {item.special_request && (
                                        <p className="text-xs text-yellow-400/80 italic mt-0.5 font-medium print:text-black/80">↳ {item.special_request}</p>
                                    )}
                                    {item.constituents && (
                                        <div className="mt-1 pl-3 border-l border-dark-border text-xs text-dark-muted space-y-0.5 print:text-black/70 print:border-black/20">
                                            {item.constituents.map((c, idx) => (
                                                <div key={idx}>
                                                    • {c.quantity}× {c.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {tocItems.length === 0 && (
                            <div className="text-center py-12 print:hidden">
                                <ListOrdered size={28} className="mx-auto mb-2 text-dark-muted" />
                                <p className="text-sm font-medium text-dark-muted">Nothing to prep</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function OrderTicket({ order, comboItems = [], onAction, actionLabel, accentColor, borderColor, bgColor, readOnly }: {
    order: KitchenOrder
    comboItems?: any[]
    onAction?: () => void
    actionLabel?: string
    accentColor: string
    borderColor: string
    bgColor: string
    readOnly?: boolean
}) {
    const tbl = order.sessions?.tables?.label || '?'

    return (
        <div className="rounded-card overflow-hidden border bg-dark-surface" style={{ borderColor }}>
            {/* Ticket header — status dot + table + aging timer (escalates) */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b"
                 style={{ borderColor, background: bgColor }}>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                    <span className="font-bold text-dark-ink">Table {tbl}</span>
                </div>
                {readOnly ? (
                    <span className="text-caption font-mono font-semibold tabular text-dark-muted">{timeAgo(order.placed_at)}</span>
                ) : (
                    <AgingTimer since={order.placed_at} dark warnAfter={5} dangerAfter={10} />
                )}
            </div>

            {/* Items */}
            <div className="p-4 space-y-2.5">
                {order.order_items?.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5">
                        <span className="font-bold text-sm w-6 shrink-0 tabular-nums mt-0.5" style={{ color: accentColor }}>
                            {item.quantity}×
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-dark-ink text-[15px] leading-snug">{item.menu_items?.name}</p>
                            {item.menu_items?.is_combo && (
                                <div className="mt-1 pl-3 border-l-2 border-dark-border text-xs text-dark-muted space-y-0.5">
                                    {comboItems
                                        .filter(c => c.combo_id === item.menu_item_id)
                                        .map(c => (
                                            <div key={c.id}>
                                                • {c.quantity * item.quantity}× {c.menu_items?.name || 'Item'}
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                            {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                                <p className="text-xs text-dark-muted mt-0.5">
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
                    <div className="mt-3 px-3 py-2 rounded-card border border-yellow-500/20 text-yellow-400/80 text-xs"
                         style={{ background: 'rgba(245,158,11,0.06)' }}>
                        <span className="font-bold text-[9px] uppercase tracking-widest block mb-0.5 text-yellow-500/60">Note</span>
                        {order.customer_note}
                    </div>
                )}

                <div className="pt-2">
                    {readOnly ? (
                        <div className="flex items-center justify-center gap-2 py-2.5 rounded-card border text-sm font-semibold"
                             style={{
                                 background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                                 borderColor: 'color-mix(in srgb, var(--success) 28%, transparent)',
                                 color: 'color-mix(in srgb, var(--success) 70%, white)',
                             }}>
                            <CheckCircle2 size={15} /> Ready — awaiting pickup
                        </div>
                    ) : (
                        <button
                            onClick={onAction}
                            className="w-full py-3 rounded-card font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 border"
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
