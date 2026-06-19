'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markCashPaid } from '@/app/(staff)/waiter/order-actions'
import { Banknote, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatCurrency, timeAgo } from '@/lib/utils'

export interface UnpaidOrder {
    id: string
    total_amount: number
    delivered_at: string | null
    session_id: string | null
    sessions?: { id: string; tables?: { label?: string } | null } | null
}

export default function CashPaymentFeed({
    initialOrders,
    restaurantId,
}: {
    initialOrders: UnpaidOrder[]
    restaurantId: string
}) {
    const [orders, setOrders] = useState<UnpaidOrder[]>(initialOrders)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const supabaseRef = useRef(createClient())

    // Remove from local list when an order gets paid via any path (realtime)
    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`cash-payment-feed-${restaurantId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${restaurantId}`,
            }, (payload) => {
                if (payload.new.payment_status === 'paid') {
                    setOrders((prev) => prev.filter((o) => o.id !== payload.new.id))
                }
                // Also pick up newly delivered+unpaid orders
                if (payload.new.status === 'delivered' && payload.new.payment_status === 'unpaid') {
                    setOrders((prev) => {
                        if (prev.some(o => o.id === payload.new.id)) return prev
                        return [...prev, payload.new as unknown as UnpaidOrder]
                    })
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    const handleCashPaid = async (orderId: string) => {
        setProcessingId(orderId)
        const res = await markCashPaid(orderId)
        if (res.error) {
            toast.error(res.error)
        } else {
            setOrders((prev) => prev.filter((o) => o.id !== orderId))
            toast.success(res.tableClosed ? 'Cash received — table closed ✅' : 'Cash received ✓')
        }
        setProcessingId(null)
    }

    if (orders.length === 0) return null

    return (
        <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Banknote size={18} className="text-amber-600" />
                Pending Cash Payments
                <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {orders.length}
                </span>
            </h2>

            {orders.map((order) => {
                const tableLabel = order.sessions?.tables?.label
                const isProcessing = processingId === order.id
                return (
                    <div key={order.id} className="bg-white rounded-xl border-2 border-amber-300 p-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-gray-900">
                                {tableLabel ? `Table ${tableLabel}` : 'Takeout'}
                            </p>
                            <p className="text-sm text-amber-700 font-bold">{formatCurrency(order.total_amount)}</p>
                            {order.delivered_at && (
                                <p className="text-xs text-gray-400 mt-0.5">Delivered {timeAgo(order.delivered_at)}</p>
                            )}
                        </div>
                        <button
                            onClick={() => handleCashPaid(order.id)}
                            disabled={isProcessing}
                            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 flex items-center gap-1.5 disabled:opacity-60 active:scale-95 transition"
                        >
                            {isProcessing
                                ? <Loader2 size={15} className="animate-spin" />
                                : <CheckCircle size={15} />}
                            Cash Received
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
