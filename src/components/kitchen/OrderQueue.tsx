'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playKitchenPing } from '@/lib/audio'
import { timeAgo } from '@/lib/utils'
import { Clock, ChefHat, CheckSquare } from 'lucide-react'
import type { OrderStatus, Order, OrderItem, OrderItemModifier, MenuItem, Session, Table } from '@/types/database'
import { updateOrderStatus } from '@/app/(staff)/kitchen/actions'

export type KitchenOrder = Order & {
    sessions?: Session & { tables?: Partial<Table> }
    order_items?: (OrderItem & {
        menu_items?: Partial<MenuItem>
        order_item_modifiers?: Partial<OrderItemModifier>[]
    })[]
}

// The query shape used to fetch full order details (DRY)
const ORDER_SELECT = `
  id, status, total_amount, placed_at, customer_note,
  sessions ( tables ( label ) ),
  order_items (
    id, quantity, special_request,
    menu_items ( name ),
    order_item_modifiers ( modifier_name, price_adjustment )
  )
` as const

export default function OrderQueue({ initialOrders, restaurantId }: { initialOrders: KitchenOrder[], restaurantId: string }) {
    const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders)
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase
            .channel(`kitchen-queue-${restaurantId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    // Fetch the full order details including relations
                    const { data } = await supabase
                        .from('orders')
                        .select(ORDER_SELECT)
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        setOrders(prev => [...prev, data as unknown as KitchenOrder])
                        playKitchenPing() // Audio alert on new order
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: payload.new.status } : o).filter(o => !['ready', 'delivered', 'cancelled'].includes(o.status)))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [restaurantId, supabase])

    const updateStatus = async (orderId: string, currentStatus: string) => {
        let nextStatus: OrderStatus = 'preparing'

        if (currentStatus === 'pending' || currentStatus === 'confirmed') nextStatus = 'preparing'
        else if (currentStatus === 'preparing') nextStatus = 'ready'
        else return

        // Optimistic UI update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o).filter(o => !['ready', 'delivered', 'cancelled'].includes(o.status)))

        // DB update via server action (bypasses RLS)
        await updateOrderStatus(orderId, nextStatus)
    }

    // Group orders for the KDS layout
    const { newOrders, preparingOrders } = useMemo(() => {
        const sorted = [...orders].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime())
        return {
            newOrders: sorted.filter(o => o.status === 'pending' || o.status === 'confirmed'),
            preparingOrders: sorted.filter(o => o.status === 'preparing')
        }
    }, [orders])

    // For mobile tab switching
    const [activeTab, setActiveTab] = useState<'new' | 'preparing'>('new')

    return (
        <div className="h-full flex flex-col md:flex-row md:overflow-x-auto p-3 md:p-6 gap-3 md:gap-6 hide-scrollbar bg-[var(--color-secondary)] text-white">

            {/* Mobile Tab Switcher — only visible below md */}
            <div className="flex md:hidden gap-2 shrink-0">
                <button
                    onClick={() => setActiveTab('new')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'new' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
                >
                    <Clock size={16} /> New <span className="bg-gray-700 px-2 py-0.5 rounded-full text-xs">{newOrders.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab('preparing')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'preparing' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
                >
                    <ChefHat size={16} /> Prep <span className="bg-gray-700 px-2 py-0.5 rounded-full text-xs">{preparingOrders.length}</span>
                </button>
            </div>

            {/* COLUMN 1: NEW ORDERS */}
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
                    {newOrders.length === 0 && <p className="text-gray-500 text-center py-8">No new orders</p>}
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
                    {preparingOrders.length === 0 && <p className="text-gray-500 text-center py-8">No orders preparing</p>}
                </div>
            </div>

        </div>
    )
}

function OrderTicket({ order, onAction, actionLabel, statusColor, accentColor }: {
    order: KitchenOrder, onAction: () => void, actionLabel: string, statusColor: string, accentColor: string
}) {
    const tableLabel = order.sessions?.tables?.label || '?'
    const [now, setNow] = useState(Date.now)

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000)
        return () => clearInterval(timer)
    }, [])

    const isOld = (now - new Date(order.placed_at).getTime()) > 15 * 60 * 1000 // 15 mins

    return (
        <div className={`bg-gray-800 rounded-xl overflow-hidden border ${statusColor} shadow-lg relative`}>
            {/* Top Bar */}
            <div className="bg-gray-800/80 px-4 flex justify-between items-center relative z-10 border-b border-gray-700 h-10">
                <div className="font-bold text-lg">Table {tableLabel}</div>
                <div className={`text-sm font-medium ${isOld ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                    {timeAgo(order.placed_at)}
                </div>
            </div>

            {/* Left Accent Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`}></div>

            {/* Items */}
            <div className="p-4 relative ml-1 bg-gray-800">
                <ul className="space-y-3 mb-4">
                    {order.order_items?.map((item) => (
                        <li key={item.id} className="text-gray-100 flex items-start leading-tight">
                            <span className="font-bold w-6 text-gray-400 shrink-0">{item.quantity}x</span>
                            <div>
                                <span className="font-medium text-[15px]">{item.menu_items?.name}</span>
                                {/* Render selected modifiers */}
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

                {/* Action Button */}
                <button
                    onClick={onAction}
                    className="w-full mt-2 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm border border-gray-600"
                >
                    <CheckSquare size={18} className={order.status === 'preparing' ? 'text-[var(--color-primary)]' : ''} />
                    {actionLabel}
                </button>
            </div>
        </div>
    )
}
