'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRestaurantTable } from '@/lib/realtime/useRestaurantTable'
import { CheckCircle, XCircle, Clock, Banknote, ScanLine, Loader2, ExternalLink } from 'lucide-react'
import { verifyPayment, verifyPaymentAndCloseTable } from '@/components/waiter/payment-verification-actions'
import { toast } from 'react-hot-toast'

interface PaymentClaim {
    id: string
    order_id: string | null
    restaurant_id: string
    amount: number
    payment_method: string
    reference_code: string | null
    screenshot_url: string | null
    staff_verified: boolean
    staff_rejected: boolean
    staff_verified_by: string | null
    staff_verified_at: string | null
    created_at: string
}

function claimStatus(c: PaymentClaim): 'pending' | 'verified' | 'rejected' {
    if (c.staff_verified) return 'verified'
    if (c.staff_rejected) return 'rejected'
    return 'pending'
}

function methodLabel(method: string) {
    switch (method) {
        case 'cash': return { label: 'Cash', icon: <Banknote size={14} className="text-amber-600" />, bg: 'bg-amber-50 text-amber-700' }
        case 'qr_scan': return { label: 'QR Scan', icon: <ScanLine size={14} className="text-blue-600" />, bg: 'bg-blue-50 text-blue-700' }
        case 'esewa': return { label: 'eSewa', icon: <ScanLine size={14} className="text-green-600" />, bg: 'bg-green-50 text-green-700' }
        case 'khalti': return { label: 'Khalti', icon: <ScanLine size={14} className="text-purple-600" />, bg: 'bg-purple-50 text-purple-700' }
        case 'fonepay': return { label: 'FonePay', icon: <ScanLine size={14} className="text-red-600" />, bg: 'bg-red-50 text-red-700' }
        default: return { label: method, icon: null, bg: 'bg-gray-100 text-gray-600' }
    }
}

export default function PaymentVerificationPanel({
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
    const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending')

    useRestaurantTable(restaurantId, 'payment_verifications', (payload) => {
        if (payload.eventType === 'INSERT') {
            setClaims((prev) => [payload.new as PaymentClaim, ...prev])
            toast('New payment claim received', { icon: '💳' })
        } else if (payload.eventType === 'UPDATE') {
            setClaims((prev) =>
                prev.map((c) => (c.id === (payload.new as PaymentClaim).id ? (payload.new as PaymentClaim) : c))
            )
        }
    })

    const handleVerify = async (claimId: string, action: 'verified' | 'rejected') => {
        setLoading(claimId)
        const res = await verifyPayment(claimId, action, userId)
        if (res.error) {
            toast.error(res.error)
        } else {
            setClaims((prev) =>
                prev.map((c) =>
                    c.id === claimId
                        ? { ...c, staff_verified: action === 'verified', staff_rejected: action === 'rejected', staff_verified_by: userId }
                        : c
                )
            )
            toast.success(action === 'verified' ? 'Payment approved' : 'Payment rejected')
        }
        setLoading(null)
    }

    const handleVerifyAndClose = async (claimId: string) => {
        setLoading(claimId)
        const res = await verifyPaymentAndCloseTable(claimId, userId)
        if (res.error) {
            toast.error(res.error)
        } else {
            setClaims((prev) =>
                prev.map((c) =>
                    c.id === claimId
                        ? { ...c, staff_verified: true, staff_rejected: false, staff_verified_by: userId }
                        : c
                )
            )
            toast.success(res.tableClosed ? 'Payment verified & table closed ✅' : 'Payment verified. Other orders still unpaid.')
        }
        setLoading(null)
    }

    const filtered = claims.filter((c) => filter === 'all' ? true : claimStatus(c) === filter)
    const pendingCount = claims.filter((c) => claimStatus(c) === 'pending').length

    return (
        <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {(['pending', 'verified', 'rejected', 'all'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                            filter === f
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {f} {f === 'pending' && pendingCount > 0 && (
                            <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No {filter === 'all' ? '' : filter} payment claims</p>
                </div>
            )}

            {filtered.map((claim) => {
                const status = claimStatus(claim)
                const method = methodLabel(claim.payment_method)
                const isLoading = loading === claim.id

                return (
                    <div key={claim.id} className={`bg-white rounded-2xl border p-4 space-y-3 ${
                        status === 'pending' ? 'border-amber-200 shadow-sm' : 'border-gray-200'
                    }`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${method.bg}`}>
                                    {method.icon} {method.label}
                                </span>
                                <span className="text-lg font-bold text-gray-900">Rs. {claim.amount.toFixed(2)}</span>
                                {claim.reference_code && (
                                    <span className="text-xs text-gray-500">· {claim.reference_code}</span>
                                )}
                            </div>
                            <div className="shrink-0">
                                {status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                        <Clock size={11} /> Pending
                                    </span>
                                )}
                                {status === 'verified' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                        <CheckCircle size={11} /> Verified
                                    </span>
                                )}
                                {status === 'rejected' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                                        <XCircle size={11} /> Rejected
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Screenshot thumbnail — routed through auth-gated proxy */}
                        {claim.screenshot_url && (
                            <div className="flex items-center gap-2">
                                <Image
                                    src={`/api/payment-proof?claim=${claim.id}`}
                                    alt="Payment proof"
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer"
                                    onClick={() => window.open(`/api/payment-proof?claim=${claim.id}`, '_blank')}
                                />
                                <a
                                    href={`/api/payment-proof?claim=${claim.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
                                >
                                    View full image <ExternalLink size={12} />
                                </a>
                            </div>
                        )}

                        <div className="text-xs text-gray-400">
                            {claim.order_id && <span>Order: {claim.order_id.substring(0, 8)}... · </span>}
                            {new Date(claim.created_at).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {status === 'pending' && (
                            <div className="flex gap-2">
                                {claim.order_id && (
                                    <button
                                        onClick={() => handleVerifyAndClose(claim.id)}
                                        disabled={isLoading}
                                        className="flex-1 bg-green-600 text-white text-sm font-medium rounded-xl py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-[0.98] transition"
                                    >
                                        {isLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                                        Approve & Close Table
                                    </button>
                                )}
                                <button
                                    onClick={() => handleVerify(claim.id, 'verified')}
                                    disabled={isLoading}
                                    className={`${claim.order_id ? '' : 'flex-1'} bg-green-100 text-green-700 text-sm font-medium rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-[0.98] transition hover:bg-green-200`}
                                >
                                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                                    {claim.order_id ? 'Approve Only' : 'Approve'}
                                </button>
                                <button
                                    onClick={() => handleVerify(claim.id, 'rejected')}
                                    disabled={isLoading}
                                    className="bg-red-100 text-red-700 text-sm font-medium rounded-xl px-3 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-[0.98] transition hover:bg-red-200"
                                >
                                    <XCircle size={15} />
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
