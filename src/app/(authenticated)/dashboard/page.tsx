import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingBag, TrendingUp, Users, UtensilsCrossed, ArrowRight, CheckCircle2, Circle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TIER_COLORS: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
}

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    past_due: 'bg-red-100 text-red-700',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
}

const ORDER_STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-emerald-100 text-emerald-700',
    delivered: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
}

export default async function DashboardPage() {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
        { count: totalOrders },
        { data: monthOrderRows },
        { count: staffCount },
        { data: recentOrders },
        { data: restaurant },
        { count: menuCount },
        { count: tableCount },
    ] = await Promise.all([
        adminSupabase.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        adminSupabase.from('orders').select('total_amount').eq('restaurant_id', restaurantId)
            .eq('payment_status', 'paid').gte('placed_at', startOfMonth.toISOString()),
        adminSupabase.from('users').select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId).neq('role_id', 5),
        adminSupabase.from('orders').select('id, status, total_amount, placed_at, sessions(tables(label))')
            .eq('restaurant_id', restaurantId).order('placed_at', { ascending: false }).limit(5),
        adminSupabase.from('restaurants')
            .select('name, subscription_tier, subscription_status, subscription_expires_at, created_at')
            .eq('id', restaurantId).single(),
        adminSupabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        adminSupabase.from('tables').select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId).eq('is_active', true),
    ])

    const monthRevenue = (monthOrderRows || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const tier = (restaurant?.subscription_tier || 'free') as string
    const status = (restaurant?.subscription_status || 'active') as string

    // Onboarding checklist — only shown for restaurants < 30 days old
    const createdAt = restaurant?.created_at ? new Date(restaurant.created_at) : null
    const isNew = createdAt ? (Date.now() - createdAt.getTime()) < 30 * 24 * 60 * 60 * 1000 : false
    const checklist = [
        { label: `Add menu items (${menuCount ?? 0} added)`, done: (menuCount ?? 0) > 0, href: '/admin/menu' },
        { label: `Add a table (${tableCount ?? 0} added)`, done: (tableCount ?? 0) > 0, href: '/admin/tables' },
        { label: `Invite a staff member (${(staffCount ?? 1) - 1} invited)`, done: (staffCount ?? 0) > 1, href: '/dashboard/team' },
    ]
    const checklistComplete = checklist.every(c => c.done)

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900">{restaurant?.name || 'Your Restaurant'}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Owner portal</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${TIER_COLORS[tier] || TIER_COLORS.free}`}>
                        {tier}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[status] || STATUS_COLORS.active}`}>
                        {status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {/* Onboarding checklist — only for new accounts that aren't done yet */}
            {isNew && !checklistComplete && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-blue-800 mb-3">Get started checklist</h2>
                    <ul className="space-y-2">
                        {checklist.map(item => (
                            <li key={item.label} className="flex items-center gap-2.5">
                                {item.done
                                    ? <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                                    : <Circle size={18} className="text-blue-300 shrink-0" />
                                }
                                {item.done
                                    ? <span className="text-sm text-blue-700 line-through opacity-70">{item.label}</span>
                                    : <Link href={item.href} className="text-sm text-blue-700 hover:underline font-medium">{item.label}</Link>
                                }
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={ShoppingBag} label="Total Orders" value={String(totalOrders ?? 0)} color="blue" />
                <KpiCard icon={TrendingUp} label="Month Revenue" value={formatCurrency(monthRevenue)} color="green" />
                <KpiCard icon={Users} label="Staff Members" value={String(staffCount ?? 0)} color="purple" />
                <KpiCard icon={UtensilsCrossed} label="Menu Items" value={String(menuCount ?? 0)} color="orange" />
            </div>

            {/* Recent orders */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
                    <Link href="/admin/orders" className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1">
                        View all <ArrowRight size={14} />
                    </Link>
                </div>

                {(recentOrders || []).length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                        No orders yet. Share your QR code to start receiving orders.
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                                    <th className="text-left px-4 py-3 font-medium">Table</th>
                                    <th className="text-left px-4 py-3 font-medium">Status</th>
                                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(recentOrders || []).map(order => {
                                    const sessions = order.sessions as unknown as { tables?: { label?: string } | null } | null
                                    const tableLabel = sessions?.tables?.label || '—'
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">Table {tableLabel}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(order.total_amount || 0)}</td>
                                            <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{timeAgo(order.placed_at)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Admin panel CTA */}
            <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Manage your restaurant</p>
                    <p className="text-xs text-gray-500 mt-0.5">Menu, staff, orders, tables, reports and more</p>
                </div>
                <Link
                    href="/admin/dashboard"
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition"
                >
                    Admin Panel <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    )
}

function KpiCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: string; color: string
}) {
    const colors: Record<string, { bg: string; icon: string; text: string }> = {
        blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   text: 'text-blue-700' },
        green:  { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-700' },
        purple: { bg: 'bg-purple-50', icon: 'text-purple-500', text: 'text-purple-700' },
        orange: { bg: 'bg-orange-50', icon: 'text-orange-500', text: 'text-orange-700' },
    }
    const c = colors[color] || colors.blue
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                <Icon size={20} className={c.icon} />
            </div>
            <div className="min-w-0">
                <p className={`text-xl font-extrabold tabular-nums ${c.text}`}>{value}</p>
                <p className="text-xs text-gray-500 truncate">{label}</p>
            </div>
        </div>
    )
}
