'use client'

import { useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { refundOrderAction } from './actions'
import { toast } from 'react-hot-toast'

export default function RefundOrderButton({
    orderId,
    paymentStatus,
}: {
    orderId: string
    paymentStatus: string
}) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    const label = paymentStatus === 'paid' ? 'Refund' : 'Void'

    async function handleSubmit() {
        if (!reason.trim()) { toast.error('Please enter a reason.'); return }
        setLoading(true)
        const res = await refundOrderAction(orderId, reason)
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(`Order ${label.toLowerCase()}ed`)
            setOpen(false)
            setReason('')
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="text-xs text-red-600 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-50 transition font-medium"
            >
                {label}
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <RotateCcw size={18} className="text-red-500" />
                            <h2 className="text-base font-bold text-gray-900">{label} Order</h2>
                        </div>
                        <p className="text-sm text-gray-500">
                            {paymentStatus === 'paid'
                                ? 'This will mark the order as refunded. Record the reason for the refund.'
                                : 'This will void the order. Record the reason.'}
                        </p>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason (e.g. wrong item delivered, customer complaint…)"
                            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                            rows={3}
                            maxLength={200}
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { setOpen(false); setReason('') }}
                                className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !reason.trim()}
                                className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1.5"
                            >
                                {loading && <Loader2 size={14} className="animate-spin" />}
                                Confirm {label}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
