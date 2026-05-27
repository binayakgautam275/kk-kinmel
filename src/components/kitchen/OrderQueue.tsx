'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playNewOrder } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { Clock, ChefHat, CheckSquare, CheckCircle2 } from 'lucide-react'
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
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    const { data } = await supabase
                        .from('orders')
                        .select(ORDER_SELECT)
                        .eq('id', payload.new.id)
                        .single()
                    if (data) {
                        const order = data as unknown as KitchenOrder
                        setOrders(prev => [...prev, order])
                        playNewOrder().catch(() => {})
                        const tableLabel = order.sessions?.tables?.label
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-gray-900 text-white shadow-2xl rounded-xl px-4 py-3 flex items-start gap-3 border border-yellow-500/30`}>
                                <span className="text-xl mt-0.5">🔔</span>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-yellow-400">New Order!</p>
                                    <p className="text-xs text-gray-300 mt-0.5 truncate">
                                        {tableLabel ? `Table ${tableLabel}` : 'Takeout'} · {formatCurrency(order.total_amount)}
                                    </p>
                                </div>
                            </div>
                        ), { duration: 6000, position: 'top-right' })
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const newStatus = payload.new.status as string
                    if (newStatus === 'delivered' || newStatus === 'cancelled') {
                        // Remove entirely — waiter delivered it
                        setOrders(prev => prev.filter(o => o.id !== payload.new.id))
                    } else {
                        // Update status in place (pending/preparing/ready all stay visible)
                        setOrders(prev => prev.map(o =>
                            o.id === payload.new.id ? { ...o, status: payload.new.status } : o
                        ))
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
            newOrders: sorted.filter(o => o.status === 'pending' || o.status === 'confirmed'),
            preparingOrders: sorted.filter(o => o.status === 'preparing'),
            readyOrders: sorted.filter(o => o.status === 'ready'),
        }
    }, [orders])

    const [activeTab, setActiveTab] = useState<'new' | 'preparing' | 'pass'>('new')

    return (
        <div className="h-full flex flex-col bg-secondary text-white">
            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden gap-2 px-3 pt-3 pb-2 shrink-0">
                <TabBtn active={activeTab === 'new'} onClick={() => setActiveTab('new')} color="text-yellow-400 border-yellow-500/40 bg-yellow-500/10">
                    <Clock size={14} /> New <Pill>{newOrders.length}</Pill>
                </TabBtn>
                <TabBtn active={activeTab === 'preparing'} onClick={() => setActiveTab('preparing')} color="text-primary border-primary/40 bg-primary/10">
                    <ChefHat size={14} /> Prep <Pill>{preparingOrders.length}</Pill>
                </TabBtn>
                <TabBtn active={activeTab === 'pass'} onClick={() => setActiveTab('pass')} color="text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                    <CheckCircle2 size={14} /> Pass <Pill>{readyOrders.length}</Pill>
                </TabBtn>
            </div>

            {/* Columns */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row md:overflow-x-auto p-3 md:p-6 gap-3 md:gap-6 hide-scrollbar">

                {/* COLUMN 1: NEW */}
                <div className={`flex-none w-full md:w-[350px] lg:w-[400px] flex flex-col gap-3 md:gap-4 ${activeTab !== 'new' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="hidden md:flex items-center justify-between border-b border-gray-700 pb-2">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <Clock className="text-yellow-500" /> New Orders
                            <span className="bg-gray-800 text-sm px-2 py-0.5 rounded-full text-gray-400">{newOrders.length}</span>
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-0 md:pr-2 space-y-3 md:space-y-4 pb-4 md:pb-12 hide-scrollbar">
                        {newOrders.map(order => (
                            <OrderTicket
                                key={order.id}
                                order={order}
                                onAction={() => updateStatus(order.id, order.status)}
                                actionLabel="Start Preparing"
                                statusColor="bg-yellow-500/10 border-yellow-500/30"
                                accentColor="bg-yellow-500"
                            />
                        ))}
                        {newOrders.length === 0 && <EmptyCol label="No new orders" />}
                    </div>
                </div>

                {/* COLUMN 2: PREPARING */}
                <div className={`flex-none w-full md:w-[350px] lg:w-[400px] flex flex-col gap-3 md:gap-4 ${activeTab !== 'preparing' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="hidden md:flex items-center justify-between border-b border-gray-700 pb-2">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <ChefHat className="text-[var(--color-primary)]" /> Preparing
                            <span className="bg-gray-800 text-sm px-2 py-0.5 rounded-full text-gray-400">{preparingOrders.length}</span>
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-0 md:pr-2 space-y-3 md:space-y-4 pb-4 md:pb-12 hide-scrollbar">
                        {preparingOrders.map(order => (
                            <OrderTicket
                                key={order.id}
                                order={order}
                                onAction={() => updateStatus(order.id, order.status)}
                                actionLabel="Mark as Ready"
                                statusColor="bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30"
                                accentColor="bg-[var(--color-primary)]"
                            />
                        ))}
                        {preparingOrders.length === 0 && <EmptyCol label="Nothing preparing" />}
                    </div>
                </div>

                {/* COLUMN 3: PASS (ready, waiting for waiter) */}
                <div className={`flex-none w-full md:w-[350px] lg:w-[400px] flex flex-col gap-3 md:gap-4 ${activeTab !== 'pass' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="hidden md:flex items-center justify-between border-b border-gray-700 pb-2">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <CheckCircle2 className="text-emerald-400" /> Pass
                            <span className="bg-gray-800 text-sm px-2 py-0.5 rounded-full text-gray-400">{readyOrders.length}</span>
                        </h2>
                        <span className="text-xs text-gray-500">Waiting for waiter</span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-0 md:pr-2 space-y-3 md:space-y-4 pb-4 md:pb-12 hide-scrollbar">
                        {readyOrders.map(order => (
                            <OrderTicket
                                key={order.id}
                                order={order}
                                statusColor="bg-emerald-500/10 border-emerald-500/30"
                                accentColor="bg-emerald-500"
                                readOnly
                            />
                        ))}
                        {readyOrders.length === 0 && <EmptyCol label="Pass is clear" icon="✓" />}
                    </div>
                </div>

            </div>
        </div>
    )
}

function TabBtn({ active, onClick, color, children }: {
    active: boolean; onClick: () => void; color: string; children: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border ${
                active ? color : 'bg-gray-800 text-gray-500 border-gray-700'
            }`}
        >
            {children}
        </button>
    )
}

function Pill({ children }: { children: React.ReactNode }) {
    return <span className="bg-gray-700/80 px-1.5 py-0.5 rounded-full text-[10px]">{children}</span>
}

function EmptyCol({ label, icon }: { label: string; icon?: string }) {
    return (
        <p className="text-gray-600 text-center py-8 text-sm">
            {icon && <span className="block text-2xl mb-1 text-gray-700">{icon}</span>}
            {label}
        </p>
    )
}

function OrderTicket({ order, onAction, actionLabel, statusColor, accentColor, readOnly }: {
    order: KitchenOrder
    onAction?: () => void
    actionLabel?: string
    statusColor: string
    accentColor: string
    readOnly?: boolean
}) {
    const tableLabel = order.sessions?.tables?.label || '?'
    const [now, setNow] = useState(Date.now)

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000)
        return () => clearInterval(timer)
    }, [])

    const ageMs = now - new Date(order.placed_at).getTime()
    const isOld = ageMs > 15 * 60 * 1000

    return (
        <div className={`bg-gray-800 rounded-xl overflow-hidden border ${statusColor} shadow-lg relative ${readOnly ? 'opacity-80' : ''}`}>
            <div className="bg-gray-800/80 px-4 flex justify-between items-center relative z-10 border-b border-gray-700 h-10">
                <div className="font-bold text-lg">Table {tableLabel}</div>
                <div className={`text-sm font-medium ${isOld && !readOnly ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                    {timeAgo(order.placed_at)}
                </div>
            </div>

            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

            <div className="p-4 relative ml-1 bg-gray-800">
                <ul className="space-y-3 mb-4">
                    {order.order_items?.map((item) => (
                        <li key={item.id} className="text-gray-100 flex items-start leading-tight">
                            <span className="font-bold w-6 text-gray-400 shrink-0">{item.quantity}x</span>
                            <div>
                                <span className="font-medium text-[15px]">{item.menu_items?.name}</span>
                                {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                                    <div className="text-xs text-blue-400/80 mt-0.5">
                                        {item.order_item_modifiers.map((mod, i) => (
                                            <span key={i}>
                                                {mod.modifier_name}{mod.price_adjustment ? ` (+${mod.price_adjustment?.toFixed(2)})` : ''}
                                                {i < (item.order_item_modifiers?.length ?? 0) - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {item.special_request && (
                                    <div className="text-sm text-yellow-500/90 mt-0.5 font-medium italic">
                                        Note: {item.special_request}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>

                {order.customer_note && (
                    <div className="mb-4 p-2 bg-yellow-500/10 rounded-md border border-yellow-500/20 text-yellow-500 text-sm">
                        <span className="font-bold block text-xs uppercase tracking-wider mb-1">Order Note</span>
                        {order.customer_note}
                    </div>
                )}

                {readOnly ? (
                    <div className="w-full mt-2 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg text-center text-sm flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Ready — awaiting pickup
                    </div>
                ) : (
                    <button
                        onClick={onAction}
                        className="w-full mt-2 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm border border-gray-600"
                    >
                        <CheckSquare size={18} className={order.status === 'preparing' ? 'text-[var(--color-primary)]' : ''} />
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    )
}
