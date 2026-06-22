import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { CheckCircle2, ArrowUpRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TIER_FEATURES: Record<string, string[]> = {
    free:       ['QR code ordering', 'Promo codes', 'Service requests', 'Split billing', 'Basic analytics', 'Up to 3 staff', 'Up to 20 menu items'],
    basic:      ['Everything in Free', 'Takeout orders', 'Up to 10 staff', 'Up to 100 menu items', 'Priority support'],
    pro:        ['Everything in Basic', 'Loyalty program', 'Dynamic pricing', 'Ingredient tracking', 'Staff shifts', 'Up to 50 staff', 'Up to 500 menu items'],
    enterprise: ['Everything in Pro', 'Multi-language menus', 'Up to 999 staff', 'Unlimited menu items', 'Dedicated support', 'Custom integrations'],
}

const TIER_COLORS: Record<string, { badge: string; border: string; title: string }> = {
    free:       { badge: 'bg-gray-100 text-gray-700',    border: 'border-gray-200',  title: 'text-gray-900' },
    basic:      { badge: 'bg-blue-100 text-blue-700',    border: 'border-blue-200',  title: 'text-blue-900' },
    pro:        { badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200', title: 'text-purple-900' },
    enterprise: { badge: 'bg-amber-100 text-amber-700',  border: 'border-amber-200', title: 'text-amber-900' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active:    { label: 'Active',     color: 'bg-green-100 text-green-700' },
    past_due:  { label: 'Past Due',   color: 'bg-red-100 text-red-700' },
    suspended: { label: 'Suspended',  color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Cancelled',  color: 'bg-gray-100 text-gray-600' },
}

function daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default async function BillingPage() {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const [{ data: restaurant }, { data: payments }] = await Promise.all([
        adminSupabase.from('restaurants')
            .select('subscription_tier, subscription_status, subscription_expires_at, name')
            .eq('id', restaurantId)
            .single(),
        adminSupabase.from('subscription_payments')
            .select('amount, payment_method, reference_code, payment_date, paid_at')
            .eq('restaurant_id', restaurantId)
            .order('paid_at', { ascending: false })
            .limit(20),
    ])

    const tier = (restaurant?.subscription_tier || 'free') as string
    const status = (restaurant?.subscription_status || 'active') as string
    const daysLeft = daysUntil(restaurant?.subscription_expires_at || null)
    const tierC = TIER_COLORS[tier] || TIER_COLORS.free
    const statusMeta = STATUS_LABELS[status] || STATUS_LABELS.active
    const features = TIER_FEATURES[tier] || TIER_FEATURES.free
    const showUpgradeCta = tier === 'free' || tier === 'basic'

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-extrabold text-gray-900">Billing &amp; Subscription</h1>

            {/* Expiry alert */}
            {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    Your subscription expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>. Contact us to renew.
                </div>
            )}
            {daysLeft !== null && daysLeft < 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    Your subscription has <strong>expired</strong>. Some features may be unavailable.
                </div>
            )}

            {/* Current plan */}
            <div className={`bg-white rounded-xl border-2 ${tierC.border} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <h2 className={`text-2xl font-extrabold capitalize ${tierC.title}`}>{tier}</h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${tierC.badge}`}>plan</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta.color}`}>{statusMeta.label}</span>
                        {daysLeft !== null && daysLeft >= 0 && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                {daysLeft}d remaining
                            </span>
                        )}
                    </div>
                </div>

                <div className="px-6 py-5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Included features</h3>
                    <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-4">
                        {features.map(f => (
                            <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
                                {f}
                            </li>
                        ))}
                    </ul>

                    {showUpgradeCta && (
                        <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between gap-4">
                            <p className="text-sm text-gray-500">Unlock more features by upgrading your plan.</p>
                            <Link
                                href="/#pricing"
                                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition"
                            >
                                Upgrade Plan <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment history */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Payment History</h2>
                </div>

                {(payments || []).length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-400">
                        No payments recorded yet.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                                <th className="text-left px-6 py-3 font-medium">Date</th>
                                <th className="text-left px-6 py-3 font-medium">Method</th>
                                <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Reference</th>
                                <th className="text-right px-6 py-3 font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(payments || []).map((p, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 text-gray-700">
                                        {(p.payment_date || p.paid_at) ? new Date(p.payment_date ?? p.paid_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600 capitalize">{p.payment_method || '—'}</td>
                                    <td className="px-6 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">{p.reference_code || '—'}</td>
                                    <td className="px-6 py-3 text-right font-medium text-gray-900">{formatCurrency(p.amount || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Contact */}
            <p className="text-sm text-center text-gray-400">
                To upgrade or for billing questions, contact{' '}
                <a href="mailto:hello@kkkhane.com" className="text-primary hover:underline">hello@kkkhane.com</a>
            </p>
        </div>
    )
}
