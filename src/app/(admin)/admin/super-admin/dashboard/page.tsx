import { requireRole } from '@/lib/auth'
import { getSaasMetricsFull } from '../actions'
import { Building2, CheckCircle, Ban, DollarSign, ShoppingBag, Crown, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TIER_BADGE: Record<string, string> = {
    free:       'bg-gray-100 text-gray-700 border-gray-200',
    basic:      'bg-blue-100 text-blue-700 border-blue-200',
    pro:        'bg-purple-100 text-purple-700 border-purple-200',
    enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
}

const TIER_BAR: Record<string, string> = {
    free: 'bg-gray-400', basic: 'bg-blue-500', pro: 'bg-purple-500', enterprise: 'bg-amber-500',
}

export default async function SuperAdminDashboardPage() {
    await requireRole('super_admin')
    const metrics = await getSaasMetricsFull()
    const proPlus = (metrics.tierBreakdown.pro || 0) + (metrics.tierBreakdown.enterprise || 0)

    return (
        <div className="space-y-5 md:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <Crown size={18} className="text-indigo-500" />
                        Platform Dashboard
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Real-time SaaS health across all tenants</p>
                </div>
                <Link href="/admin/super-admin/restaurants"
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl hover:bg-indigo-100 transition">
                    Manage Tenants <ArrowRight size={12} />
                </Link>
            </div>

            {/* Expiring alert */}
            {metrics.expiringSoon.length > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">
                            {metrics.expiringSoon.length} subscription{metrics.expiringSoon.length > 1 ? 's' : ''} expiring within 7 days
                        </p>
                        <ul className="mt-1 space-y-0.5">
                            {metrics.expiringSoon.map(r => (
                                <li key={r.id} className="text-xs text-amber-700">
                                    <strong>{r.name}</strong> — expires {new Date(r.subscription_expires_at).toLocaleDateString('en-IN')}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <KpiCard icon={Building2}   bg="bg-indigo-50"  ic="text-indigo-600"  label="Total Tenants"   value={metrics.totalRestaurants} />
                <KpiCard icon={CheckCircle} bg="bg-emerald-50" ic="text-emerald-600" label="Active Tenants"  value={metrics.activeRestaurants} />
                <KpiCard icon={Ban}         bg="bg-red-50"     ic="text-red-500"     label="Suspended"       value={metrics.suspendedRestaurants} />
                <KpiCard icon={DollarSign}  bg="bg-green-50"   ic="text-green-600"   label="MRR (Rs.)"       value={`Rs. ${metrics.mrr.toLocaleString()}`} isText />
                <KpiCard icon={ShoppingBag} bg="bg-blue-50"    ic="text-blue-600"    label="Total Orders"    value={metrics.totalOrders} />
                <KpiCard icon={Crown}        bg="bg-purple-50"  ic="text-purple-600" label="Pro+ Accounts"   value={proPlus} />
            </div>

            {/* Tier distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 text-sm mb-4">Subscription Distribution</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(metrics.tierBreakdown).map(([tier, count]) => (
                        <div key={tier} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${TIER_BADGE[tier] || TIER_BADGE.free}`}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}: {count}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(metrics.tierBreakdown).map(([tier, count]) => {
                        const total = metrics.totalRestaurants || 1
                        const pct = Math.round((count / total) * 100)
                        return (
                            <div key={tier}>
                                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${TIER_BAR[tier] || 'bg-gray-400'}`}
                                         style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 text-center tabular-nums">{pct}%</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                {/* Top restaurants */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 text-sm">Top Restaurants (30 days)</h2>
                        <TrendingUp size={14} className="text-gray-300" />
                    </div>
                    <div className="divide-y divide-gray-50">
                        {metrics.top5ByOrders.length === 0 ? (
                            <p className="px-5 py-8 text-sm text-gray-400 text-center">No order data yet</p>
                        ) : metrics.top5ByOrders.map((r, i) => (
                            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                                <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                                    <p className="text-xs text-gray-400">{r.count} orders · Rs. {r.revenue.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent signups */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 text-sm">Recent Tenant Signups</h2>
                        <Link href="/admin/super-admin/restaurants" className="text-xs text-indigo-600 hover:underline">View all →</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {metrics.recentTenants.length === 0 ? (
                            <p className="px-5 py-8 text-sm text-gray-400 text-center">No tenants yet</p>
                        ) : metrics.recentTenants.map(r => (
                            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                    <Building2 size={14} className="text-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                                    <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TIER_BADGE[r.subscription_tier] || TIER_BADGE.free}`}>
                                    {r.subscription_tier}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick actions */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                <h2 className="font-semibold text-indigo-900 text-sm mb-3">Quick Actions</h2>
                <div className="flex flex-wrap gap-2">
                    {[
                        { href: '/admin/super-admin/restaurants', label: 'Manage Tenants' },
                        { href: '/admin/super-admin/analytics',   label: 'Analytics' },
                        { href: '/admin/super-admin/payments',    label: 'Subscription Payments' },
                        { href: '/admin/super-admin/reports',     label: 'EOD Reports' },
                        { href: '/admin/super-admin/config',      label: 'Platform Config' },
                    ].map(({ href, label }) => (
                        <Link key={href} href={href}
                              className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

function KpiCard({ icon: Icon, bg, ic, label, value, isText }: {
    icon: React.ElementType; bg: string; ic: string; label: string; value: number | string; isText?: boolean
}) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={18} className={ic} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
                <p className={`font-bold text-gray-900 leading-tight tabular-nums ${isText ? 'text-lg' : 'text-xl'}`}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
            </div>
        </div>
    )
}
