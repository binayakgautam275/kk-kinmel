'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playStatusUpdate } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { CheckCircle2, ChefHat, Package, CheckCircle, Clock } from 'lucide-react'
import type { Order, OrderItem, MenuItem, OrderItemModifier } from '@/types/database'

type OrderWithItems = Order & {
    order_items?: (OrderItem & {
        menu_items?: Partial<MenuItem>
        order_item_modifiers?: OrderItemModifier[]
    })[]
}

const STEPS = [
    { id: 'pending',   label: 'Received',  icon: Clock,        hint: 'Waiting for kitchen to confirm…' },
    { id: 'confirmed', label: 'Confirmed', icon: CheckCircle,  hint: 'Kitchen has received your order.' },
    { id: 'preparing', label: 'Preparing', icon: ChefHat,      hint: 'The chef is preparing your food.' },
    { id: 'ready',     label: 'Ready',     icon: Package,      hint: 'Your order is ready! A waiter is bringing it.' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2, hint: 'Enjoy your meal!' },
]

const STATUS_TOAST: Record<string, { emoji: string; message: string; color: string }> = {
    confirmed: { emoji: '✓', message: 'Order confirmed by kitchen!', color: 'text-blue-600' },
    preparing: { emoji: '👨‍🍳', message: 'Kitchen is preparing your food…', color: 'text-orange-600' },
    ready:     { emoji: '🎉', message: 'Your order is ready! A waiter is on the way.', color: 'text-green-600' },
    delivered: { emoji: '🍽️', message: 'Order delivered. Enjoy!', color: 'text-gray-700' },
    cancelled: { emoji: '✕', message: 'Order has been cancelled.', color: 'text-red-600' },
}

export default function OrderTracker({ orderId, initialOrder }: { orderId: string; initialOrder: OrderWithItems }) {
    const [order, setOrder] = useState<OrderWithItems>(initialOrder)
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`order:${orderId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
                (payload) => {
                    const newStatus = (payload.new as Order).status
                    setOrder((prev) => ({ ...prev, ...(payload.new as Order) }))
                    const info = newStatus ? STATUS_TOAST[newStatus] : null
                    if (info) {
                        playStatusUpdate().catch(() => {})
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100`}>
                                <span className="text-2xl">{info.emoji}</span>
                                <p className={`text-sm font-semibold ${info.color}`}>{info.message}</p>
                            </div>
                        ), { duration: 5000, position: 'top-center' })
                    }
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [orderId])

    const isCancelled = order.status === 'cancelled'
    const currentStepIndex = STEPS.findIndex(s => s.id === order.status)
    const progress = isCancelled || currentStepIndex <= 0 ? 0 : currentStepIndex / (STEPS.length - 1)

    return (
        <div className="space-y-6">
            {/* Status card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden relative">
                {/* Ambient glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary opacity-5 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center mb-8 relative z-10">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isCancelled ? 'Order Cancelled' : currentStepIndex === 3 ? 'Ready for Delivery!' : 'Order Status'}
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Order #{orderId.substring(0, 5).toUpperCase()}
                        <span className="mx-2">·</span>
                        {timeAgo(order.placed_at)}
                    </p>
                </div>

                {isCancelled && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center relative z-10">
                        <p className="text-red-700 font-medium">This order has been cancelled.</p>
                        <p className="text-sm text-red-500 mt-1">Please contact your waiter for assistance.</p>
                    </div>
                )}

                {/* Stepper */}
                <div className="relative z-10">
                    {/* Background connector line */}
                    <div className="absolute left-[27px] top-7 bottom-7 w-0.5 bg-gray-100" />
                    {/* Animated progress overlay */}
                    <div
                        className="absolute left-[27px] top-7 bottom-7 w-0.5 bg-primary origin-top transition-transform duration-700 ease-in-out"
                        style={{ transform: `scaleY(${progress})` }}
                    />

                    <div className="space-y-7">
                        {STEPS.map((step, index) => {
                            const Icon = step.icon
                            const isCompleted = !isCancelled && index <= currentStepIndex
                            const isCurrent = !isCancelled && index === currentStepIndex

                            return (
                                <div key={step.id} className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 border-white transition-colors duration-500 ${
                                        isCurrent
                                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                            : isCompleted
                                                ? 'bg-secondary text-white'
                                                : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        <Icon size={22} className={isCurrent ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {step.label}
                                        </h3>
                                        {isCurrent && (
                                            <p className="text-sm text-gray-500 mt-0.5">{step.hint}</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Order details card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 pb-4 border-b border-gray-100">Order Details</h3>

                <ul className="divide-y divide-gray-50">
                    {order.order_items?.map((item) => (
                        <li key={item.id} className="py-3 flex justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="font-medium text-gray-500 text-sm">{item.quantity}×</span>
                                    <span className="text-gray-800 font-medium text-sm">{item.menu_items?.name}</span>
                                </div>

                                {/* Modifier chips */}
                                {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {item.order_item_modifiers.map(mod => (
                                            <span key={mod.id} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                {mod.modifier_name}
                                                {mod.price_adjustment !== 0 && (
                                                    <span className="ml-0.5 text-gray-400">
                                                        {mod.price_adjustment > 0 ? `+${formatCurrency(mod.price_adjustment)}` : formatCurrency(mod.price_adjustment)}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {item.special_request && (
                                    <p className="text-[11px] text-gray-400 mt-1 italic">"{item.special_request}"</p>
                                )}
                            </div>
                            <span className="font-medium text-primary text-sm shrink-0">
                                {formatCurrency(item.unit_price * item.quantity)}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-semibold text-gray-600">Total</span>
                    <span className="font-bold text-xl text-gray-900">{formatCurrency(order.total_amount)}</span>
                </div>
            </div>
        </div>
    )
}
