'use client'

import { useState } from 'react'
import { generateEodReportAction } from './actions'
import { FileText, Calendar, TrendingUp, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import type { EodReport } from '@/types/database'

export default function ReportsViewer({ initialReports, restaurantId }: {
    initialReports: EodReport[]
    restaurantId: string
}) {
    const [reports, setReports] = useState(initialReports)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
    const [generating, setGenerating] = useState(false)
    const [expanded, setExpanded] = useState<string | null>(null)

    async function handleGenerate() {
        setGenerating(true)
        const result = await generateEodReportAction(restaurantId, selectedDate)
        setGenerating(false)
        if (result.error) { toast.error(result.error); return }
        toast.success('Report generated!')
        // Refetch is handled by revalidation, but add to local state
        if (result.data) {
            setReports(prev => {
                const filtered = prev.filter(r => r.report_date !== selectedDate)
                return [result.data, ...filtered].sort((a, b) => b.report_date.localeCompare(a.report_date))
            })
        }
    }

    function fmt(n: number) {
        return `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`
    }

    return (
        <div className="space-y-4">
            {/* Generate */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-wrap items-end gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Report Date</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <button onClick={handleGenerate} disabled={generating}
                    className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                    <FileText size={16} /> {generating ? 'Generating...' : 'Generate Report'}
                </button>
            </div>

            {/* Reports List */}
            <div className="space-y-3">
                {reports.map(r => (
                    <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center gap-3">
                                <Calendar size={18} className="text-gray-400" />
                                <span className="font-semibold text-gray-900">{r.report_date}</span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <div className="text-right">
                                    <p className="text-gray-500">Revenue</p>
                                    <p className="font-semibold text-gray-900">{fmt(r.total_revenue)}</p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-gray-500">Orders</p>
                                    <p className="font-semibold text-gray-900">{r.total_orders}</p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-gray-500">Net</p>
                                    <p className="font-semibold text-green-700">{fmt(r.net_revenue)}</p>
                                </div>
                            </div>
                        </button>
                        {expanded === r.id && (
                            <div className="px-6 pb-5 border-t border-gray-100 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <Stat icon={<DollarSign size={14} />} label="Gross Revenue" value={fmt(r.total_revenue)} />
                                <Stat icon={<TrendingUp size={14} />} label="Net Revenue" value={fmt(r.net_revenue)} />
                                <Stat label="Tax Collected" value={fmt(r.total_tax)} />
                                <Stat label="Tips" value={fmt(r.total_tips)} />
                                <Stat label="Discounts" value={fmt(r.total_discounts)} />
                                <Stat label="Cash Total" value={fmt(r.cash_total)} />
                                <Stat label="Card Total" value={fmt(r.card_total)} />
                                <Stat label="Avg Order" value={fmt(r.avg_order_value)} />
                                <Stat label="COGS" value={fmt(r.total_cogs)} />
                                <Stat label="Gross Profit" value={fmt(r.gross_profit)} />
                                <Stat label="Voids" value={String(r.total_voids)} />
                                <Stat label="Refunds" value={String(r.total_refunds)} />
                                <Stat label="Cancelled" value={String(r.total_cancelled)} />
                                {r.notes && (
                                    <div className="col-span-full">
                                        <p className="text-gray-500 text-xs">Notes</p>
                                        <p className="text-gray-700">{r.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {reports.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                        No reports generated yet. Select a date and click Generate.
                    </div>
                )}
            </div>
        </div>
    )
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
    return (
        <div>
            <p className="text-gray-500 text-xs flex items-center gap-1">{icon}{label}</p>
            <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
        </div>
    )
}
