import { requireRole } from '@/lib/auth'
import { getAllPricingRulesOverview } from '../actions'
import { DollarSign, CheckCircle, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TIER_COLORS: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
}

export default async function PricingPage() {
    await requireRole('super_admin')

    const result = await getAllPricingRulesOverview()
    const rows = (result.data || []) as Array<{
        restaurant_id: string
        restaurant: { name: string; subscription_tier: string } | null
        dynamicPricingEnabled: boolean
        activeRules: number
    }>

    const enabledCount = rows.filter(r => r.dynamicPricingEnabled).length
    const totalRules = rows.reduce((s, r) => s + r.activeRules, 0)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing</h1>
                <p className="text-gray-500 mt-1 text-sm">Read-only overview of dynamic pricing feature across all tenants.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Restaurants</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-bold text-purple-600">{enabledCount}</div>
                    <div className="text-xs text-gray-500 mt-0.5">With Pricing Enabled</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-bold text-gray-900">{totalRules}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total Active Rules</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-800">Feature Status Per Restaurant</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Dynamic pricing is available on Pro and Enterprise tiers</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left">Restaurant</th>
                                <th className="px-5 py-3 text-left">Tier</th>
                                <th className="px-5 py-3 text-center">Dynamic Pricing</th>
                                <th className="px-5 py-3 text-right">Active Rules</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map(r => (
                                <tr key={r.restaurant_id} className="hover:bg-gray-50/50">
                                    <td className="px-5 py-3 font-medium text-gray-900">{r.restaurant?.name || '—'}</td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLORS[r.restaurant?.subscription_tier || 'free']}`}>
                                            {r.restaurant?.subscription_tier || '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        {r.dynamicPricingEnabled
                                            ? <CheckCircle size={14} className="text-emerald-500 mx-auto" />
                                            : <XCircle size={14} className="text-gray-300 mx-auto" />
                                        }
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {r.activeRules > 0
                                            ? <span className="font-semibold text-purple-700">{r.activeRules}</span>
                                            : <span className="text-gray-400">0</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-400">No data</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
