import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, ShoppingBag, Users, AlertTriangle, Clock, UserCheck, Tag, Package, ArrowRight, CheckCircle2 } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function AdminDashboardPage() {
    const currentUser = await getCurrentUser()
    if (currentUser.role === 'super_admin') redirect('/admin/super-admin/dashboard')
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
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('placed_at', today.toISOString()),
        supabase.from('sessions').select('id').eq('restaurant_id', restaurantId).eq('status', 'active'),
        supabase.from('orders').select('id, total_amount, status, placed_at').eq('restaurant_id', restaurantId).order('placed_at', { ascending: false }).limit(8),
        supabase.from('orders').select('total_amount, status').eq('restaurant_id', restaurantId).gte('placed_at', today.toISOString()),
        supabase.from('orders').select('total_amount').eq('restaurant_id', restaurantId).gte('placed_at', monthStart.toISOString()).eq('status', 'delivered'),
        supabase.from('menu_categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_active', true),
        adminSupabase.from('staff_shifts').select('id, clock_in, users(full_name, roles(name))').eq('restaurant_id', restaurantId).is('clock_out', null).order('clock_in', { ascending: false }),
        supabase.from('ingredients').select('id, name, stock_quantity, reorder_level, unit').eq('restaurant_id', restaurantId).eq('is_active', true).not('reorder_level', 'is', null),
        supabase.from('promo_codes').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_active', true),
    ])

    const totalRevenueToday = (todayOrders || []).filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_amount || 0), 0)
    const totalRevenueMonth = (monthOrders || []).reduce((s, o) => s + (o.total_amount || 0), 0)

    const pipeline = { pending: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 }
    for (const o of (todayOrders || [])) {
        const s = o.status as keyof typeof pipeline
        if (s in pipeline) pipeline[s]++
    }

    const lowStock = (lowStockIngredients || []).filter(i => i.reorder_level !== null && i.stock_quantity <= i.reorder_level)

    const shifts = (activeShifts || []) as unknown as Array<{
        id: string; clock_in: string
        users: { full_name: string; roles: { name: string } | null } | null
    }>

    const onboardingSteps = [
        { done: (menuCategoryCount || 0) > 0, label: 'Add your first menu category', href: '/admin/menu' },
        { done: (menuItemCount || 0) > 0, label: 'Add your first menu item', href: '/admin/menu' },
        { done: (tableCount || 0) > 0, label: 'Create a table and generate a QR code', href: '/admin/tables' },
    ]
    const showChecklist = onboardingSteps.some(s => !s.done)

    return (
        <div className="space-y-5 md:space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Today&apos;s Overview</h1>
                <p className="text-sm text-gray-400 mt-0.5">Real-time operations snapshot</p>
            </div>

            {/* Onboarding */}
            {showChecklist && (
                <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
                    <h2 className="font-bold text-gray-900 text-sm mb-4">Get your restaurant ready</h2>
                    <div className="space-y-3">
                        {onboardingSteps.map((step, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {step.done ? <CheckCircle2 size={14} /> : i + 1}
                                </div>
                                {step.done
                                    ? <span className="text-sm text-gray-400 line-through">{step.label}</span>
                                    : <Link href={step.href} className="text-sm font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1">{step.label} <ArrowRight size={13} /></Link>
                                }
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Low stock alert */}
            {lowStock.length > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-amber-800">{lowStock.length} ingredient{lowStock.length > 1 ? 's' : ''} running low</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {lowStock.slice(0, 3).map(i => `${i.name} (${i.stock_quantity} ${i.unit})`).join(', ')}
                            {lowStock.length > 3 && ` +${lowStock.length - 3} more`}
                            {' · '}<Link href="/admin/ingredients" className="underline font-medium">View →</Link>
                        </p>
                    </div>
                </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <KpiCard icon={TrendingUp}  bg="bg-[var(--color-primary)]/8"  ic="text-[var(--color-primary)]" label="Revenue Today"        value={formatCurrency(totalRevenueToday)} />
                <KpiCard icon={ShoppingBag} bg="bg-emerald-50" ic="text-emerald-600" label="Orders Today"          value={String(totalOrdersToday || 0)} />
                <KpiCard icon={Users}       bg="bg-blue-50"    ic="text-blue-600"    label="Active Tables"          value={String(activeSessions?.length || 0)} />
                <KpiCard icon={TrendingUp}  bg="bg-indigo-50"  ic="text-indigo-600"  label="Revenue This Month"     value={formatCurrency(totalRevenueMonth)} />
                <KpiCard icon={UserCheck}   bg="bg-teal-50"    ic="text-teal-600"    label="Staff On Shift"         value={String(shifts.length)} />
                <KpiCard
                    icon={lowStock.length > 0 ? AlertTriangle : Package}
                    bg={lowStock.length > 0 ? 'bg-amber-50' : 'bg-gray-50'}
                    ic={lowStock.length > 0 ? 'text-amber-500' : 'text-gray-400'}
                    label="Low Stock Items"
                    value={String(lowStock.length)}
                    accent={lowStock.length > 0}
                />
            </div>

            {/* Pipeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 text-sm">Today&apos;s Order Pipeline</h2>
                    <Link href="/admin/orders" className="text-xs text-[var(--color-primary)] hover:underline font-medium flex items-center gap-1">
                        All Orders <ArrowRight size={12} />
                    </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { label: 'Pending',   count: pipeline.pending,   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                        { label: 'Preparing', count: pipeline.preparing, cls: 'bg-orange-50 text-orange-700 border-orange-200' },
                        { label: 'Ready',     count: pipeline.ready,     cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
                        { label: 'Delivered', count: pipeline.delivered, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    ].map((p, i) => (
                        <div key={p.label} className="flex items-center gap-1.5">
                            {i > 0 && <span className="text-gray-200 text-xs hidden sm:block">→</span>}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${p.cls}`}>
                                <span className="font-bold tabular-nums">{p.count}</span>
                                <span className="hidden sm:inline">{p.label}</span>
                            </div>
                        </div>
                    ))}
                    <div className="ml-auto">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-red-50 text-red-600 border-red-200">
                            <span className="font-bold tabular-nums">{pipeline.cancelled}</span>
                            <span className="hidden sm:inline">Cancelled</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                {/* Staff */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-teal-500" />
                            <h2 className="font-semibold text-gray-900 text-sm">Staff On Shift</h2>
                        </div>
                        <Link href="/admin/shifts" className="text-xs text-[var(--color-primary)] hover:underline">Manage →</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {shifts.length === 0 ? (
                            <p className="px-5 py-8 text-sm text-gray-400 text-center">No staff currently clocked in.</p>
                        ) : (
                            shifts.slice(0, 5).map(s => {
                                const roleName = (s.users?.roles as unknown as { name: string } | null)?.name || ''
                                const since = new Date(s.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                return (
                                    <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-xs font-bold text-teal-700 shrink-0">
                                            {(s.users?.full_name || '?')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{s.users?.full_name || '—'}</p>
                                            <p className="text-xs text-gray-400 capitalize">{roleName.replace('_', ' ')}</p>
                                        </div>
                                        <span className="text-xs text-gray-400 shrink-0 tabular-nums">since {since}</span>
                                    </div>
                                )
                            })
                        )}
                        {shifts.length > 5 && (
                            <p className="px-5 py-2 text-xs text-gray-400 text-center">+{shifts.length - 5} more</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900 text-sm">Quick Actions</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-2">
                        {[
                            { href: '/admin/orders',      label: 'View Orders',    cls: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                            { href: '/admin/menu',        label: 'Edit Menu',      cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                            { href: '/admin/tables',      label: 'Tables & QR',   cls: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                            { href: '/admin/staff',       label: 'Staff',          cls: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
                            { href: '/admin/ingredients', label: 'Ingredients',   cls: lowStock.length > 0 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100', badge: lowStock.length > 0 ? lowStock.length : undefined },
                            { href: '/admin/promos',      label: 'Promo Codes',   cls: 'bg-pink-50 text-pink-700 hover:bg-pink-100', badge: activePromos || undefined },
                        ].map(({ href, label, cls, badge }) => (
                            <Link key={href} href={href} className={`relative flex items-center justify-center gap-1.5 text-xs font-semibold py-3.5 px-4 rounded-xl transition ${cls}`}>
                                {label}
                                {badge !== undefined && badge > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {badge > 9 ? '9+' : badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Recent Orders</h2>
                    <Link href="/admin/orders" className="text-xs text-[var(--color-primary)] hover:underline font-medium flex items-center gap-1">
                        View All <ArrowRight size={12} />
                    </Link>
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                <th className="px-5 py-3 text-left">Order ID</th>
                                <th className="px-5 py-3 text-left">Time</th>
                                <th className="px-5 py-3 text-left">Status</th>
                                <th className="px-5 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentOrders?.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{order.id.substring(0, 8).toUpperCase()}</td>
                                    <td className="px-5 py-3 text-xs text-gray-400 tabular-nums">{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                                    <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(order.total_amount)}</td>
                                </tr>
                            ))}
                            {(!recentOrders || recentOrders.length === 0) && (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">No orders yet today.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="md:hidden divide-y divide-gray-50">
                    {recentOrders?.map(order => (
                        <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="font-mono text-sm font-bold text-gray-900">#{order.id.substring(0, 6).toUpperCase()}</p>
                                <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <StatusBadge status={order.status} />
                            <p className="font-bold text-gray-900 tabular-nums">{formatCurrency(order.total_amount)}</p>
                        </div>
                    ))}
                    {(!recentOrders || recentOrders.length === 0) && (
                        <p className="p-8 text-center text-sm text-gray-400">No orders yet today.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function KpiCard({ icon: Icon, bg, ic, label, value, accent }: {
    icon: React.ElementType; bg: string; ic: string; label: string; value: string; accent?: boolean
}) {
    return (
        <div className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3 ${accent ? 'border-amber-200' : 'border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={18} className={ic} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
                <p className={`text-xl font-bold tabular-nums leading-tight ${accent ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        ready:     'bg-cyan-50 text-cyan-700 border-cyan-200',
        preparing: 'bg-orange-50 text-orange-700 border-orange-200',
        pending:   'bg-amber-50 text-amber-700 border-amber-200',
        cancelled: 'bg-red-50 text-red-600 border-red-200',
    }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}
