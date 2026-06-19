'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, Smartphone, Loader2, DoorClosed } from 'lucide-react'
import { verifyPayment, verifyPaymentAndCloseTable } from './payment-verification-actions'
import { timeAgo, formatCurrency } from '@/lib/utils'
import { toast } from 'react-hot-toast'

export interface PaymentClaim {
    id: string
    order_id: string | null
    restaurant_id: string
    amount: number
    payment_method: string
    reference_code: string | null
    staff_verified: boolean
    staff_rejected: boolean
    staff_verified_by: string | null
    staff_verified_at: string | null
    rejection_reason: string | null
    created_at: string
}

function claimStatus(c: PaymentClaim): 'pending' | 'verified' | 'rejected' {
    if (c.staff_verified) return 'verified'
    if (c.staff_rejected) return 'rejected'
    return 'pending'
}

export default function PaymentVerificationFeed({
    initialClaims,
    restaurantId,
    userId,
}: {
    initialClaims: PaymentClaim[]
    restaurantId: string
    userId: string
}) {
    const [claims, setClaims] = useState<PaymentClaim[]>(initialClaims)
    const [loading, setLoading] = useState<string | null>(null)
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`payment-verifications-${restaurantId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'payment_verifications', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => { setClaims((prev) => [payload.new as PaymentClaim, ...prev]) }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'payment_verifications', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    setClaims((prev) => prev.map((c) => (c.id === (payload.new as PaymentClaim).id ? (payload.new as PaymentClaim) : c)))
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    const handleVerify = async (claimId: string, action: 'verified' | 'rejected') => {
        setLoading(claimId)
        const res = await verifyPayment(claimId, action, userId)
        if (!res.error) {
            setClaims((prev) => prev.map((c) => c.id === claimId
                ? { ...c, staff_verified: action === 'verified', staff_rejected: action === 'rejected', staff_verified_by: userId }
                : c
            ))
        }
        setLoading(null)
    }

    const handleVerifyAndClose = async (claimId: string) => {
        setLoading(claimId)
        const res = await verifyPaymentAndCloseTable(claimId, userId)
        if (res.error) {
            toast.error(res.error)
        } else {
            setClaims((prev) => prev.map((c) => c.id === claimId
                ? { ...c, staff_verified: true, staff_rejected: false, staff_verified_by: userId }
                : c
            ))
            toast.success(res.tableClosed ? 'Payment verified & table closed ✅' : 'Payment verified.')
        }
        setLoading(null)
    }

    const pendingClaims = claims.filter((c) => claimStatus(c) === 'pending')
    const resolvedClaims = claims.filter((c) => claimStatus(c) !== 'pending')

    if (claims.length === 0) return null

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <Smartphone size={15} className="text-emerald-500" />
                <h2 className="font-semibold text-gray-900 text-sm">Payment Verifications</h2>
                {pendingClaims.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                        {pendingClaims.length} pending
                    </span>
                )}
            </div>

            <div className="divide-y divide-gray-50">
                {pendingClaims.map((claim) => (
                    <div key={claim.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock size={13} className="text-amber-500" />
                                <span className="text-xs font-semibold text-amber-700">Pending</span>
                            </div>
                            <span className="text-[10px] text-gray-400">{timeAgo(claim.created_at)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xs text-gray-400">Amount</span>
                                <span className="font-bold text-gray-900 tabular-nums">Rs. {claim.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xs text-gray-400">Via</span>
                                <span className="font-medium text-gray-700 capitalize">{claim.payment_method}</span>
                            </div>
                            {claim.reference_code && (
                                <div className="flex items-baseline gap-1.5 col-span-2">
                                    <span className="text-xs text-gray-400">Ref</span>
                                    <span className="font-mono text-xs font-medium text-gray-700">{claim.reference_code}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            {claim.order_id && (
                                <button
                                    onClick={() => handleVerifyAndClose(claim.id)}
                                    disabled={loading === claim.id}
                                    className="w-full flex items-center justify-center gap-1.5 bg-[var(--color-secondary)] text-white font-semibold text-sm py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-50 transition"
                                >
                                    {loading === claim.id ? <Loader2 size={15} className="animate-spin" /> : <DoorClosed size={15} />}
                                    Verify & Close Table
                                </button>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleVerify(claim.id, 'verified')}
                                    disabled={loading === claim.id}
                                    className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white font-semibold text-sm py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-50 transition"
                                >
                                    {loading === claim.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleVerify(claim.id, 'rejected')}
                                    disabled={loading === claim.id}
                                    className="flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-200 font-semibold text-sm py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-50 transition"
                                >
                                    <XCircle size={14} />
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {resolvedClaims.length > 0 && (
                    <details className="group">
                        <summary className="px-5 py-3 text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center justify-between">
                            {resolvedClaims.length} resolved claim{resolvedClaims.length > 1 ? 's' : ''}
                            <span className="group-open:rotate-180 transition-transform">▾</span>
                        </summary>
                        <div className="px-4 pb-3 space-y-2">
                            {resolvedClaims.map((claim) => {
                                const status = claimStatus(claim)
                                return (
                                    <div key={claim.id} className={`rounded-xl border px-3 py-2.5 flex items-center justify-between text-sm ${
                                        status === 'verified' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-800 tabular-nums">Rs. {claim.amount.toFixed(2)}</span>
                                            {claim.reference_code && <span className="text-xs text-gray-400">· {claim.reference_code}</span>}
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-wide ${status === 'verified' ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {status}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </details>
                )}
            </div>
        </div>
    )
}
