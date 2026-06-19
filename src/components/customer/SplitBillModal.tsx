'use client'

import { useState } from 'react'
import { Users, Divide, Loader2, Check } from 'lucide-react'
import { createBillSplit } from '@/app/api/billing/actions'
import { formatCurrency } from '@/lib/utils'
import type { SplitType } from '@/types/database'
import { toast } from 'react-hot-toast'

export default function SplitBillModal({
    sessionId,
    totalAmount,
    onClose,
}: {
    sessionId: string
    totalAmount: number
    onClose: () => void
}) {
    const [step, setStep] = useState<'choose' | 'count' | 'result'>('choose')
    const [splitType, setSplitType] = useState<SplitType>('even')
    const [splitCount, setSplitCount] = useState(2)
    const [loading, setLoading] = useState(false)
    const [splits, setSplits] = useState<{ label: string; amount: number; total: number }[]>([])

    const handleSplit = async () => {
        setLoading(true)

        const res = await createBillSplit(sessionId, splitType, splitCount)

        setLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else if (res.splits) {
            toast.success('Bill split successfully!')
            setSplits(res.splits)
            setStep('result')
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-lg text-gray-900">Split the Bill</h2>
                    <button onClick={onClose} className="text-gray-400 text-sm font-medium">Cancel</button>
                </div>

                <div className="p-5">
                    {/* Total */}
                    <div className="text-center mb-5">
                        <p className="text-sm text-gray-500">Total Bill</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                    </div>

                    {step === 'choose' && (
                        <div className="space-y-3">
                            <button
                                onClick={() => { setSplitType('even'); setStep('count') }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all"
                            >
                                <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg">
                                    <Divide size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900">Split Evenly</p>
                                    <p className="text-sm text-gray-500">Divide the total equally</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { setSplitType('by_seat'); handleSplitBySeat() }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all"
                            >
                                <div className="bg-green-100 text-green-600 p-2.5 rounded-lg">
                                    <Users size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900">Split by Seat</p>
                                    <p className="text-sm text-gray-500">Each person pays for their items</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {step === 'count' && (
                        <div className="space-y-5">
                            <p className="text-sm text-gray-600 text-center">How many people?</p>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                                    className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-bold text-gray-600"
                                >
                                    −
                                </button>
                                <span className="text-4xl font-bold text-gray-900 w-16 text-center">{splitCount}</span>
                                <button
                                    onClick={() => setSplitCount(Math.min(10, splitCount + 1))}
                                    className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-bold text-gray-600"
                                >
                                    +
                                </button>
                            </div>
                            <p className="text-center text-lg text-gray-700">
                                {formatCurrency(totalAmount / splitCount)} per person
                            </p>
                            <button
                                onClick={handleSplit}
                                disabled={loading}
                                className="w-full bg-gray-900 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Divide size={18} />}
                                Split Bill
                            </button>
                        </div>
                    )}

                    {step === 'result' && (
                        <div className="space-y-3">
                            {splits.map((split, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                                            {i + 1}
                                        </div>
                                        <span className="font-medium text-gray-800">{split.label}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{formatCurrency(split.total)}</span>
                                </div>
                            ))}
                            <button
                                onClick={onClose}
                                className="w-full bg-green-600 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4"
                            >
                                <Check size={18} />
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    async function handleSplitBySeat() {
        setLoading(true)
        setSplitType('by_seat')
        const res = await createBillSplit(sessionId, 'by_seat', 0)
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
            setStep('choose')
        } else if (res.splits) {
            toast.success('Bill split successfully!')
            setSplits(res.splits)
            setStep('result')
        }
    }
}
