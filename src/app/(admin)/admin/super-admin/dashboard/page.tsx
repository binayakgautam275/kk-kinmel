import { requireRole } from '@/lib/auth'
import { getSaasMetricsFull } from '../actions'
import { Building2, CheckCircle, Ban, DollarSign, ShoppingBag, Crown, AlertTriangle, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TIER_COLORS: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700 border-gray-200',
    basic: 'bg-blue-100 text-blue-700 border-blue-200',
    pro: 'bg-purple-100 text-purple-700 border-purple-200',
    enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default async function SuperAdminDashboardPage() {
    await requireRole('super_admin')

    const metrics = await getSaasMetricsFull()

    const proPlus = (metrics.tierBreakdown.pro || 0) + (metrics.tierBreakdown.enterprise || 0)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
                <p className="text-gray-500 mt-1 text-sm">Real-time SaaS health across all restaurant tenants.</p>
            </div>

            {/* Expiring Soon Alert */}
            {metrics.expiringSoon.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800 text-sm">
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

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard icon={Building2} label="Total Tenants" value={metrics.totalRestaurants} color="bg-indigo-500" />
                <KpiCard icon={CheckCircle} label="Active Tenants" value={metrics.activeRestaurants} color="bg-emerald-500" />
                <KpiCard icon={Ban} label="Suspended" value={metrics.suspendedRestaurants} color="bg-red-500" />
                <KpiCard icon={DollarSign} label="MRR (Rs.)" value={`Rs. ${metrics.mrr.toLocaleString()}`} color="bg-green-600" isText />
                <KpiCard icon={ShoppingBag} label="Total Orders" value={metrics.totalOrders} color="bg-blue-500" />
                <KpiCard icon={Crown} label="Pro+ Accounts" value={proPlus} color="bg-amber-500" />
            </div>

            {/* Tier Distribution */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-800 mb-4 text-base">Subscription Distribution</h2>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(metrics.tierBreakdown).map(([tier, count]) => (
                        <div key={tier} className={`px-4 py-2 rounded-full text-sm font-semibold border ${TIER_COLORS[tier] || TIER_COLORS.free}`}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}: {count}
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                    {Object.entries(metrics.tierBreakdown).map(([tier, count]) => {
                        const total = metrics.totalRestaurants || 1
                        const pct = Math.round((count / total) * 100)
                        return (
                            <div key={tier} className="flex-1 min-w-[80px]">
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${tier === 'enterprise' ? 'bg-amber-500' : tier === 'pro' ? 'bg-purple-500' : tier === 'basic' ? 'bg-blue-500' : 'bg-gray-400'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 text-center">{pct}%</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 5 by Orders */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 text-base">Top Restaurants (Last 30 Days)</h2>
                        <TrendingUp size={16} className="text-gray-400" />
                    </div>
                    {metrics.top5ByOrders.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No order data yet</p>
                    ) : (
                        <ol className="space-y-3">
                            {metrics.top5ByOrders.map((r, i) => (
                                <li key={r.id} className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                                        <p className="text-xs text-gray-500">{r.count} orders · Rs. {r.revenue.toLocaleString()}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* Recent Tenant Signups */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800 text-base">Recent Tenant Signups</h2>
                        <Link href="/admin/super-admin/restaurants" className="text-xs text-indigo-600 hover:underline font-medium">View all</Link>
                    </div>
                    {metrics.recentTenants.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No tenants yet</p>
                    ) : (
                        <ul className="space-y-3">
                            {metrics.recentTenants.map(r => (
                                <li key={r.id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                        <Building2 size={14} className="text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                                        <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_COLORS[r.subscription_tier] || TIER_COLORS.free}`}>
                                        {r.subscription_tier}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Quick Links */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                <h2 className="font-semibold text-indigo-900 text-sm mb-3">Quick Actions</h2>
                <div className="flex flex-wrap gap-2">
                    <QuickLink href="/admin/super-admin/restaurants" label="Manage Tenants" />
                    <QuickLink href="/admin/super-admin/analytics" label="View Analytics" />
                    <QuickLink href="/admin/super-admin/payments" label="Subscription Payments" />
                    <QuickLink href="/admin/super-admin/reports" label="EOD Reports" />
                    <QuickLink href="/admin/super-admin/config" label="Platform Config" />
                </div>
            </div>
        </div>
    )
}

function KpiCard({
    icon: Icon,
    label,
    value,
    color,
    isText = false,
}: {
    icon: React.ElementType
    label: string
    value: number | string
    color: string
    isText?: boolean
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5">
            <div className={`inline-flex p-2.5 rounded-xl text-white ${color} mb-3`}>
                <Icon size={18} />
            </div>
            <div className={`font-bold text-gray-900 ${isText ? 'text-lg' : 'text-2xl'}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
        </div>
    )
}

function QuickLink({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
        >
            {label}
        </Link>
    )
}
