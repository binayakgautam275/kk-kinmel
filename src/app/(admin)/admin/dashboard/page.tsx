import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, ShoppingBag, Users, AlertTriangle, Clock, UserCheck, Tag, Package } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function AdminDashboardPage() {
    const currentUser = await getCurrentUser()
    if (currentUser.role === 'super_admin') {
        redirect('/admin/super-admin/dashboard')
    }
    const { restaurantId } = currentUser

    const supabase = await createServerClient()
    const adminSupabase = await createAdminClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [
        { count: totalOrdersToday },
        { data: activeSessions },
        { data: recentOrders },
        { data: todayOrders },
        { data: monthOrders },
        { count: menuCategoryCount },
        { count: menuItemCount },
        { count: tableCount },
        { data: activeShifts },
        { data: lowStockIngredients },
        { count: activePromos },
    ] = await Promise.all([
        supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .gte('placed_at', today.toISOString()),
        supabase
            .from('sessions')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'active'),
        supabase
            .from('orders')
            .select('id, total_amount, status, placed_at')
            .eq('restaurant_id', restaurantId)
            .order('placed_at', { ascending: false })
            .limit(8),
        // All today's orders for pipeline + revenue
        supabase
            .from('orders')
            .select('total_amount, status')
            .eq('restaurant_id', restaurantId)
            .gte('placed_at', today.toISOString()),
        // This month's delivered orders for MoM revenue
        supabase
            .from('orders')
            .select('total_amount')
            .eq('restaurant_id', restaurantId)
            .gte('placed_at', monthStart.toISOString())
            .eq('status', 'delivered'),
        supabase.from('menu_categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_active', true),
        // Active staff shifts
        adminSupabase
            .from('staff_shifts')
            .select('id, clock_in, users(full_name, roles(name))')
            .eq('restaurant_id', restaurantId)
            .is('clock_out', null)
            .order('clock_in', { ascending: false }),
        // Low stock ingredients
        supabase
            .from('ingredients')
            .select('id, name, stock_quantity, reorder_level, unit')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .not('reorder_level', 'is', null),
        // Active promo codes
        supabase
            .from('promo_codes')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true),
    ])

    const totalRevenueToday = (todayOrders || [])
        .filter(o => o.status === 'delivered')
        .reduce((s, o) => s + (o.total_amount || 0), 0)

    const totalRevenueMonth = (monthOrders || [])
        .reduce((s, o) => s + (o.total_amount || 0), 0)

    // Order pipeline counts
    const pipeline = { pending: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 }
    for (const o of (todayOrders || [])) {
        const s = o.status as keyof typeof pipeline
        if (s in pipeline) pipeline[s]++
    }

    const lowStock = (lowStockIngredients || []).filter(
        i => i.reorder_level !== null && i.stock_quantity <= i.reorder_level
    )

    const shifts = (activeShifts || []) as unknown as Array<{
        id: string
        clock_in: string
        users: { full_name: string; roles: { name: string } | null } | null
    }>

    // Onboarding checklist
    const onboardingSteps = [
        { done: (menuCategoryCount || 0) > 0, label: 'Add your first menu category', href: '/admin/menu' },
        { done: (menuItemCount || 0) > 0, label: 'Add your first menu item', href: '/admin/menu' },
        { done: (tableCount || 0) > 0, label: 'Create a table and generate a QR code', href: '/admin/tables' },
    ]
    const showChecklist = onboardingSteps.some(s => !s.done)

    return (
        <div className="space-y-4 md:space-y-6">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Today&apos;s Overview</h1>
                <p className="text-gray-500 mt-1 text-sm">Real-time operations dashboard.</p>
            </div>

            {/* Onboarding Checklist */}
            {showChecklist && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <h2 className="font-bold text-blue-900 text-base mb-3">Get your restaurant ready</h2>
                    <ul className="space-y-2.5">
                        {onboardingSteps.map((step, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-blue-300 text-blue-500'}`}>
                                    {step.done ? '✓' : i + 1}
                                </span>
                                {step.done ? (
                                    <span className="text-sm text-emerald-700 line-through">{step.label}</span>
                                ) : (
                                    <Link href={step.href} className="text-sm text-blue-800 font-medium hover:underline">{step.label} →</Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-amber-800">{lowStock.length} ingredient{lowStock.length > 1 ? 's' : ''} running low</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {lowStock.slice(0, 3).map(i => `${i.name} (${i.stock_quantity} ${i.unit})`).join(', ')}
                            {lowStock.length > 3 && ` +${lowStock.length - 3} more`}
                            {' ·'} <Link href="/admin/ingredients" className="underline font-medium">View Ingredients</Link>
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <KpiCard icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" label="Revenue Today" value={formatCurrency(totalRevenueToday)} />
                <KpiCard icon={ShoppingBag} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Orders Today" value={String(totalOrdersToday || 0)} />
                <KpiCard icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600" label="Active Tables" value={String(activeSessions?.length || 0)} />
                <KpiCard icon={TrendingUp} iconBg="bg-indigo-50" iconColor="text-indigo-600" label="Revenue This Month" value={formatCurrency(totalRevenueMonth)} />
                <KpiCard icon={UserCheck} iconBg="bg-teal-50" iconColor="text-teal-600" label="Staff On Shift" value={String(shifts.length)} />
                <KpiCard
                    icon={lowStock.length > 0 ? AlertTriangle : Package}
                    iconBg={lowStock.length > 0 ? 'bg-amber-50' : 'bg-gray-50'}
                    iconColor={lowStock.length > 0 ? 'text-amber-500' : 'text-gray-400'}
                    label="Low Stock Items"
                    value={String(lowStock.length)}
                    accent={lowStock.length > 0}
                />
            </div>

            {/* Today's Order Pipeline */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Today&apos;s Order Pipeline</h2>
                <div className="flex flex-wrap gap-2 md:gap-3">
                    <PipelinePill label="Pending" count={pipeline.pending} color="bg-yellow-50 text-yellow-700 border-yellow-200" />
                    <span className="text-gray-300 hidden md:flex items-center">→</span>
                    <PipelinePill label="Preparing" count={pipeline.preparing} color="bg-orange-50 text-orange-700 border-orange-200" />
                    <span className="text-gray-300 hidden md:flex items-center">→</span>
                    <PipelinePill label="Ready" count={pipeline.ready} color="bg-cyan-50 text-cyan-700 border-cyan-200" />
                    <span className="text-gray-300 hidden md:flex items-center">→</span>
                    <PipelinePill label="Delivered" count={pipeline.delivered} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
                    <div className="ml-auto">
                        <PipelinePill label="Cancelled" count={pipeline.cancelled} color="bg-red-50 text-red-600 border-red-200" />
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <Link href="/admin/orders" className="text-xs text-indigo-600 hover:underline font-medium">View All Orders →</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Staff on Shift */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 md:px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-teal-500" />
                            <h2 className="text-sm font-semibold text-gray-700">Staff On Shift</h2>
                        </div>
                        <Link href="/admin/shifts" className="text-xs text-indigo-600 hover:underline">Manage →</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {shifts.length === 0 ? (
                            <p className="px-5 py-6 text-sm text-gray-400 text-center">No staff currently clocked in.</p>
                        ) : (
                            shifts.slice(0, 5).map(s => {
                                const roleName = (s.users?.roles as unknown as { name: string } | null)?.name || ''
                                const since = new Date(s.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                return (
                                    <div key={s.id} className="flex items-center gap-3 px-4 md:px-5 py-2.5">
                                        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700 shrink-0">
                                            {(s.users?.full_name || '?')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{s.users?.full_name || '—'}</p>
                                            <p className="text-xs text-gray-400 capitalize">{roleName.replace('_', ' ')}</p>
                                        </div>
                                        <span className="text-xs text-gray-400 shrink-0">since {since}</span>
                                    </div>
                                )
                            })
                        )}
                        {shifts.length > 5 && (
                            <div className="px-5 py-2 text-xs text-gray-400 text-center">+{shifts.length - 5} more</div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 md:px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-sm font-semibold text-gray-700">Quick Actions</h2>
                    </div>
                    <div className="p-3 md:p-4 grid grid-cols-2 gap-2">
                        <QuickLink href="/admin/orders" label="View Orders" color="bg-emerald-50 text-emerald-700 hover:bg-emerald-100" />
                        <QuickLink href="/admin/menu" label="Edit Menu" color="bg-blue-50 text-blue-700 hover:bg-blue-100" />
                        <QuickLink href="/admin/tables" label="Tables & QR" color="bg-purple-50 text-purple-700 hover:bg-purple-100" />
                        <QuickLink href="/admin/staff" label="Staff" color="bg-teal-50 text-teal-700 hover:bg-teal-100" />
                        <QuickLink href="/admin/ingredients" label="Ingredients" color={lowStock.length > 0 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'} badge={lowStock.length > 0 ? lowStock.length : undefined} />
                        <QuickLink href="/admin/promos" label="Promo Codes" color="bg-pink-50 text-pink-700 hover:bg-pink-100" badge={activePromos || undefined} />
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Recent Orders</h2>
                    <Link href="/admin/orders" className="text-xs text-indigo-600 hover:underline font-medium">View All →</Link>
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left">Order ID</th>
                                <th className="px-5 py-3 text-left">Time</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentOrders?.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-5 py-3 font-mono font-medium text-gray-900">{order.id.substring(0, 8).toUpperCase()}</td>
                                    <td className="px-5 py-3 text-gray-500 text-xs">{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-5 py-3">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(order.total_amount)}</td>
                                </tr>
                            ))}
                            {(!recentOrders || recentOrders.length === 0) && (
                                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No recent orders.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-100">
                    {recentOrders?.map((order) => (
                        <div key={order.id} className="p-4 flex items-center justify-between gap-3">
                            <div>
                                <div className="font-mono text-sm font-bold text-gray-900">#{order.id.substring(0, 6).toUpperCase()}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            <StatusBadge status={order.status} />
                            <div className="font-bold text-gray-900 text-sm shrink-0">{formatCurrency(order.total_amount)}</div>
                        </div>
                    ))}
                    {(!recentOrders || recentOrders.length === 0) && (
                        <div className="p-8 text-center text-gray-400">No recent orders.</div>
                    )}
                </div>
            </div>
        </div>
    )
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, accent }: {
    icon: React.ElementType
    iconBg: string
    iconColor: string
    label: string
    value: string
    accent?: boolean
}) {
    return (
        <div className={`bg-white p-3 md:p-5 rounded-xl border shadow-sm flex items-center gap-3 md:gap-4 ${accent ? 'border-amber-200' : 'border-gray-200'}`}>
            <div className={`${iconBg} p-2.5 md:p-3 rounded-xl shrink-0`}>
                <Icon size={20} className={iconColor} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
                <p className={`text-lg md:text-2xl font-bold ${accent ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
            </div>
        </div>
    )
}

function PipelinePill({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${color}`}>
            <span className="text-base font-bold">{count}</span>
            <span className="hidden sm:inline">{label}</span>
        </div>
    )
}

function QuickLink({ href, label, color, badge }: { href: string; label: string; color: string; badge?: number }) {
    return (
        <Link href={href} className={`relative flex items-center justify-center text-xs font-semibold py-3 px-4 rounded-lg transition ${color}`}>
            {label}
            {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </Link>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        ready: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        preparing: 'bg-orange-50 text-orange-700 border-orange-200',
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        cancelled: 'bg-red-50 text-red-600 border-red-200',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}
