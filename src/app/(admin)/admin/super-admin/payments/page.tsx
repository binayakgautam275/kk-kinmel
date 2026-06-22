import { requireRole } from '@/lib/auth'
import { getAllSubscriptionPayments, getAllRestaurants } from '../actions'
import { CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TIER_COLORS: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
}

const METHOD_LABELS: Record<string, string> = {
    cash: 'Cash', esewa: 'eSewa', khalti: 'Khalti', bank_transfer: 'Bank Transfer', fonepay: 'FonePay',
}

export default async function PaymentsPage() {
    await requireRole('super_admin')

    const [paymentsResult, restaurantsResult] = await Promise.all([
        getAllSubscriptionPayments(200),
        getAllRestaurants(),
    ])

    const payments = (paymentsResult.data || []) as unknown as Array<{
        id: string
        restaurant_id: string
        amount: number
        payment_method: string
        reference_code: string | null
        notes: string | null
        created_at: string
        restaurants: { name: string; subscription_tier: string; subscription_expires_at: string | null; subscription_status: string } | null
    }>

    const restaurants = (restaurantsResult.data || []) as Array<{
        id: string
        name: string
        subscription_tier: string
        subscription_status: string
        subscription_expires_at: string | null
        is_suspended: boolean
    }>

    const now = Date.now()
    const totalMrr = payments
        .filter(p => now - new Date(p.created_at).getTime() < 30 * 24 * 3600 * 1000)
        .reduce((s, p) => s + (p.amount || 0), 0)

    const expiringSoon = restaurants.filter(r => {
        if (!r.subscription_expires_at) return false
        const diff = new Date(r.subscription_expires_at).getTime() - now
        return diff > 0 && diff < 7 * 24 * 3600 * 1000
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Subscription Payments</h1>
                <p className="text-gray-500 mt-1 text-sm">Track subscription billing and tenant payment history.</p>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-extrabold text-gray-900">Rs. {totalMrr.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Revenue Last 30 Days</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-extrabold text-gray-900">{payments.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total Payments Recorded</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className={`text-2xl font-extrabold ${expiringSoon.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {expiringSoon.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Expiring This Week</div>
                </div>
            </div>

            {/* Expiring Alert */}
            {expiringSoon.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Subscriptions expiring soon</p>
                        <ul className="mt-1 space-y-0.5">
                            {expiringSoon.map(r => (
                                <li key={r.id} className="text-xs text-amber-700">
                                    <strong>{r.name}</strong> — expires {new Date(r.subscription_expires_at!).toLocaleDateString('en-IN')}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Payment History */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-800">Payment History</h2>
                    <p className="text-xs text-gray-500 mt-0.5">All recorded subscription payments</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left">Restaurant</th>
                                <th className="px-5 py-3 text-left">Tier</th>
                                <th className="px-5 py-3 text-right">Amount</th>
                                <th className="px-5 py-3 text-left">Method</th>
                                <th className="px-5 py-3 text-left">Reference</th>
                                <th className="px-5 py-3 text-left">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payments.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50">
                                    <td className="px-5 py-3 font-medium text-gray-900">{p.restaurants?.name || '—'}</td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLORS[p.restaurants?.subscription_tier || 'free']}`}>
                                            {p.restaurants?.subscription_tier || '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right font-semibold text-gray-900">Rs. {(p.amount || 0).toLocaleString()}</td>
                                    <td className="px-5 py-3 text-gray-600">{METHOD_LABELS[p.payment_method] || p.payment_method}</td>
                                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{p.reference_code || '—'}</td>
                                    <td className="px-5 py-3 text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No payments recorded yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-800">Subscription Status</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Current billing status for all tenants</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left">Restaurant</th>
                                <th className="px-5 py-3 text-left">Tier</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-left">Expires</th>
                                <th className="px-5 py-3 text-left">Days Left</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {restaurants.map(r => {
                                const daysLeft = r.subscription_expires_at
                                    ? Math.ceil((new Date(r.subscription_expires_at).getTime() - now) / (1000 * 60 * 60 * 24))
                                    : null
                                return (
                                    <tr key={r.id} className={`hover:bg-gray-50/50 ${r.is_suspended ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-5 py-3 font-medium text-gray-900">{r.name}</td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLORS[r.subscription_tier] || TIER_COLORS.free}`}>
                                                {r.subscription_tier}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`flex items-center gap-1 text-xs font-medium ${r.is_suspended ? 'text-red-600' : r.subscription_status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {r.is_suspended
                                                    ? <><AlertTriangle size={12} /> Suspended</>
                                                    : r.subscription_status === 'active'
                                                        ? <><CheckCircle size={12} /> Active</>
                                                        : <><Clock size={12} /> {r.subscription_status}</>
                                                }
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 text-xs">
                                            {r.subscription_expires_at ? new Date(r.subscription_expires_at).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                        <td className="px-5 py-3">
                                            {daysLeft !== null ? (
                                                <span className={`text-xs font-semibold ${daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                                                    {daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
                                                </span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
