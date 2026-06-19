'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playStatusUpdate } from '@/lib/audio'
import { playVoice } from '@/lib/voice'
import { toast } from 'react-hot-toast'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { CheckCircle2, ChefHat, Package, CheckCircle, Clock, XCircle } from 'lucide-react'
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
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2, hint: 'Enjoy your meal! 🍽️' },
]

const STATUS_TOAST: Record<string, { emoji: string; message: string }> = {
    confirmed: { emoji: '✓', message: 'Order confirmed by kitchen!' },
    preparing: { emoji: '👨‍🍳', message: 'Kitchen is preparing your food…' },
    ready:     { emoji: '🎉', message: 'Your order is ready!' },
    delivered: { emoji: '🍽️', message: 'Order delivered. Enjoy!' },
    cancelled: { emoji: '✕', message: 'Order has been cancelled.' },
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
                        if (newStatus === 'preparing') {
                            playVoice('customer_order_preparing')
                        } else if (newStatus === 'ready') {
                            playVoice('customer_order_ready')
                        }
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100`}>
                                <span className="text-2xl">{info.emoji}</span>
                                <p className="text-sm font-semibold text-gray-800">{info.message}</p>
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
    const progressPct = isCancelled || currentStepIndex <= 0 ? 0 : (currentStepIndex / (STEPS.length - 1)) * 100
    const isDelivered = order.status === 'delivered'

    return (
        <div className="space-y-4">
            {/* Status card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Top accent band */}
                <div className="h-1 w-full" style={{
                    background: isCancelled
                        ? '#ef4444'
                        : isDelivered
                            ? '#22c55e'
                            : 'var(--color-primary)',
                }} />

                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {isCancelled ? 'Order Cancelled' : isDelivered ? 'Delivered!' : 'Order Status'}
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                #{orderId.substring(0, 6).toUpperCase()} · {timeAgo(order.placed_at)}
                            </p>
                        </div>
                        {isCancelled && (
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <XCircle size={20} className="text-red-500" />
                            </div>
                        )}
                        {isDelivered && (
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                                <CheckCircle2 size={20} className="text-green-500" />
                            </div>
                        )}
                    </div>

                    {isCancelled && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-sm font-medium text-red-700">This order has been cancelled.</p>
                            <p className="text-xs text-red-500 mt-0.5">Please contact your waiter for assistance.</p>
                        </div>
                    )}

                    {/* Steps */}
                    <div className="relative">
                        {/* Vertical track */}
                        <div className="absolute left-[18px] top-5 bottom-5 w-0.5 bg-gray-100 rounded-full" />
                        {/* Progress fill */}
                        {!isCancelled && (
                            <div
                                className="absolute left-[18px] top-5 w-0.5 rounded-full origin-top transition-all duration-700 ease-in-out"
                                style={{
                                    height: `calc(100% - 40px)`,
                                    transform: `scaleY(${progressPct / 100})`,
                                    background: 'var(--color-primary)',
                                }}
                            />
                        )}

                        <div className="space-y-6 relative">
                            {STEPS.map((step, index) => {
                                const Icon = step.icon
                                const isCompleted = !isCancelled && index < currentStepIndex
                                const isCurrent = !isCancelled && index === currentStepIndex
                                const isFuture = isCancelled || index > currentStepIndex

                                return (
                                    <div key={step.id} className="flex items-start gap-4 pl-1">
                                        <div className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                                            isCurrent
                                                ? 'text-white shadow-lg'
                                                : isCompleted
                                                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                                    : 'bg-gray-50 text-gray-300'
                                        }`} style={isCurrent ? { background: 'var(--color-primary)', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent)' } : {}}>
                                            {isCompleted ? (
                                                <CheckCircle size={15} className="text-[var(--color-primary)]" />
                                            ) : (
                                                <Icon size={15} className={isCurrent ? 'animate-pulse' : ''} />
                                            )}
                                            {isCurrent && (
                                                <span className="absolute inset-0 rounded-full animate-ping opacity-20"
                                                      style={{ background: 'var(--color-primary)' }} />
                                            )}
                                        </div>
                                        <div className="pt-1.5">
                                            <p className={`text-sm font-semibold leading-none ${
                                                isFuture ? 'text-gray-300' : isCurrent ? 'text-gray-900' : 'text-gray-600'
                                            }`}>
                                                {step.label}
                                            </p>
                                            {isCurrent && (
                                                <p className="text-xs text-gray-400 mt-1">{step.hint}</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Order details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm">Your Order</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {order.order_items?.map((item) => (
                        <div key={item.id} className="px-5 py-3 flex justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{item.quantity}×</span>
                                    <span className="text-sm font-medium text-gray-800 leading-snug">{item.menu_items?.name}</span>
                                </div>
                                {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {item.order_item_modifiers.map(mod => (
                                            <span key={mod.id} className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
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
                            <span className="text-sm font-semibold text-gray-700 tabular-nums shrink-0">
                                {formatCurrency(item.unit_price * item.quantity)}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="px-5 py-4 flex justify-between items-center border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Total</span>
                    <span className="font-bold text-lg text-gray-900 tabular-nums">{formatCurrency(order.total_amount)}</span>
                </div>
            </div>
        </div>
    )
}
