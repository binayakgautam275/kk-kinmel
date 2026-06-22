'use client'

import { X, ShoppingBag, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface OrderConfirmModalProps {
    itemCount: number
    totalAmount: number
    isPlacing: boolean
    onConfirm: () => void
    onCancel: () => void
}

export default function OrderConfirmModal({
    itemCount,
    totalAmount,
    isPlacing,
    onConfirm,
    onCancel,
}: OrderConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#1A1006]/50 backdrop-blur-sm"
                onClick={!isPlacing ? onCancel : undefined}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl max-w-sm w-full border border-[#EDD9C8] shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#E85D04] to-[#D14E00] px-6 pt-6 pb-8 text-center text-white relative">
                    {!isPlacing && (
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
                        <ShoppingBag size={28} />
                    </div>
                    <h2 className="text-xl font-black">Confirm Your Order?</h2>
                    <p className="text-white/70 text-sm font-semibold mt-1">
                        Your food will be sent to the kitchen
                    </p>
                </div>

                {/* Summary */}
                <div className="px-6 py-5">
                    <div className="flex items-center justify-between py-3 border-b border-[#F0E0D0]">
                        <span className="text-sm text-[#8C6A50] font-semibold">Items</span>
                        <span className="text-sm font-bold text-[#1A1006]">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-[#8C6A50] font-semibold">Total</span>
                        <span className="text-lg font-black text-[#E85D04] tabular-nums">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isPlacing}
                        className="flex-1 py-3.5 rounded-2xl border-2 border-[#EDD9C8] text-[#8C6A50] font-bold text-sm active:scale-95 transition disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isPlacing}
                        className="flex-1 py-3.5 rounded-2xl bg-[#E85D04] text-white font-bold text-sm active:scale-95 transition shadow-md shadow-[#E85D04]/20 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isPlacing ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Placing...
                            </>
                        ) : (
                            'Confirm Order'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
