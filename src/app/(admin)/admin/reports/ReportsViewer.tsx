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
                {reports.map(r => {
                    let notesText = r.notes || ''
                    let uniqueCustomers = r.total_orders // fallback
                    let rushHour = 'N/A'
                    let topSellers: Array<{ name: string; quantity: number; revenue: number }> = []
                    let paymentBreakdown: Record<string, number> = {}

                    if (r.notes) {
                        try {
                            const parsed = JSON.parse(r.notes)
                            if (parsed && typeof parsed === 'object') {
                                notesText = parsed.notesText || ''
                                uniqueCustomers = typeof parsed.uniqueCustomers === 'number' ? parsed.uniqueCustomers : r.total_orders
                                rushHour = parsed.rushHour || 'N/A'
                                topSellers = Array.isArray(parsed.topSellers) ? parsed.topSellers : []
                                paymentBreakdown = parsed.paymentBreakdown && typeof parsed.paymentBreakdown === 'object' && !Array.isArray(parsed.paymentBreakdown) ? parsed.paymentBreakdown : {}
                            }
                        } catch (e) {
                            // Keep default plain text notesText
                        }
                    }

                    return (
                        <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                            <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/70 transition">
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-gray-400" />
                                    <span className="font-semibold text-gray-900">{r.report_date}</span>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-right">
                                        <p className="text-gray-500 text-xs">Revenue</p>
                                        <p className="font-bold text-gray-900 text-base">{fmt(r.total_revenue)}</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <p className="text-gray-500 text-xs">Orders</p>
                                        <p className="font-semibold text-gray-900">{r.total_orders}</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <p className="text-gray-500 text-xs">Net</p>
                                        <p className="font-bold text-green-700">{fmt(r.net_revenue)}</p>
                                    </div>
                                </div>
                            </button>
                            {expanded === r.id && (
                                <div className="px-6 pb-6 border-t border-gray-100 pt-5 space-y-6">
                                    {/* Operational Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5 text-sm bg-gray-50/40 p-5 rounded-xl border border-gray-100/80">
                                        <Stat icon={<DollarSign size={14} className="text-gray-400" />} label="Gross Revenue" value={fmt(r.total_revenue)} />
                                        <Stat icon={<TrendingUp size={14} className="text-green-600" />} label="Net Revenue" value={fmt(r.net_revenue)} />
                                        <Stat label="Tax Collected" value={fmt(r.total_tax)} />
                                        <Stat label="Discounts" value={fmt(r.total_discounts)} />
                                        <Stat label="Cash Total" value={fmt(r.cash_total)} />
                                        <Stat label="Card Total" value={fmt(r.card_total)} />
                                        <Stat label="Avg Order Spend" value={fmt(r.avg_order_value)} />
                                        <Stat label="Total Customers" value={String(uniqueCustomers)} />
                                        <Stat label="COGS" value={fmt(r.total_cogs)} />
                                        <Stat label="Gross Profit" value={fmt(r.gross_profit)} />
                                        <Stat label="Most Rush Hour" value={rushHour} />
                                        <Stat label="Tips" value={fmt(r.total_tips)} />
                                        <Stat label="Voids" value={String(r.total_voids)} />
                                        <Stat label="Refunds" value={String(r.total_refunds)} />
                                        <Stat label="Cancelled Orders" value={String(r.total_cancelled)} />
                                        <div>
                                            <p className="text-gray-500 text-xs font-medium">Unverified Payments</p>
                                            <p className={`font-semibold mt-0.5 ${(r.unverified_orders ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                {r.unverified_orders ?? 0}
                                                {(r.unverified_orders ?? 0) > 0 && (
                                                    <span className="ml-1.5 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">⚠ investigate</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Breakdown & Best Sellers */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Left: Payment Method Breakdown */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
                                            <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Payment breakdown</h4>
                                            <div className="space-y-3">
                                                {Object.entries(paymentBreakdown).map(([method, amount]) => {
                                                    const n = typeof amount === 'number' ? amount : Number(amount) || 0
                                                    return (
                                                        <div key={method} className="flex justify-between text-sm items-center">
                                                            <span className="capitalize text-gray-600 font-semibold">{method.replace('_', ' ')}</span>
                                                            <span className="font-bold text-gray-950 font-mono">{fmt(n)}</span>
                                                        </div>
                                                    )
                                                })}
                                                {Object.keys(paymentBreakdown).length === 0 && (
                                                    <>
                                                        <div className="flex justify-between text-sm items-center">
                                                            <span className="text-gray-600 font-semibold">Cash</span>
                                                            <span className="font-bold text-gray-950 font-mono">{fmt(r.cash_total)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm items-center">
                                                            <span className="text-gray-600 font-semibold">Card & Others</span>
                                                            <span className="font-bold text-gray-950 font-mono">{fmt(r.card_total)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Top 5 Best Sellers */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
                                            <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Top 5 Best Selling Items</h4>
                                            <div className="space-y-3">
                                                {topSellers.map((item, idx) => {
                                                    const name = item && typeof item === 'object' ? (item.name || 'Unknown Item') : 'Unknown Item'
                                                    const quantity = item && typeof item === 'object' ? (typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 0) : 0
                                                    const revenue = item && typeof item === 'object' ? (typeof item.revenue === 'number' ? item.revenue : Number(item.revenue) || 0) : 0
                                                    return (
                                                        <div key={idx} className="flex justify-between text-sm items-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-gray-100 text-gray-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold">{idx + 1}</span>
                                                                <span className="text-gray-700 font-semibold">{name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-900">{quantity} sold</span>
                                                                <span className="text-xs text-gray-400 font-semibold">({fmt(revenue)})</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {topSellers.length === 0 && (
                                                    <p className="text-sm text-gray-400 italic text-center py-4">No item sales recorded for this date.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {notesText && (
                                        <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4">
                                            <h5 className="text-amber-800 font-bold text-xs uppercase tracking-wider mb-1">Manager Notes</h5>
                                            <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{notesText}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
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
