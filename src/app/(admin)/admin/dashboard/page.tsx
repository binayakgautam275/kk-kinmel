import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import {
    TrendingUp, ShoppingBag, Users, AlertTriangle, Clock, UserCheck, Package,
    ArrowRight, CheckCircle2, ChevronRight, UtensilsCrossed, QrCode, Tag, ClipboardList, Boxes, Inbox,
    Rocket,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, StatCard, StatusBadge, EmptyState } from '@/components/ui'
import type { Tone } from '@/components/ui'

export const revalidate = 0

export default async function AdminDashboardPage() {
    const currentUser = await getCurrentUser()
    if (currentUser.role === 'super_admin') redirect('/admin/super-admin/dashboard')
    const { restaurantId } = currentUser

    const adminSupabase = await createAdminClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const now = new Date().toISOString()
    const [
        { count: totalOrdersToday },
        { count: activeSessionCount },
        { data: recentOrders },
        { data: todayOrders },
        { data: monthOrders },
        { count: menuCategoryCount },
        { count: menuItemCount },
        { count: tableCount },
        { data: activeShifts },
        { data: lowStockIngredients },
        { count: activePromos },
        { count: staffCount },
        { data: restaurantSettings },
    ] = await Promise.all([
        // All queries use adminSupabase (service role) — skips RLS policy evaluation
        adminSupabase.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('placed_at', today.toISOString()),
        // Count-only: previously fetched all IDs just to get .length
        adminSupabase.from('sessions').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'active').gt('expires_at', now),
        adminSupabase.from('orders').select('id, total_amount, status, placed_at').eq('restaurant_id', restaurantId).order('placed_at', { ascending: false }).limit(8),
        adminSupabase.from('orders').select('total_amount, status').eq('restaurant_id', restaurantId).gte('placed_at', today.toISOString()),
        adminSupabase.from('orders').select('total_amount').eq('restaurant_id', restaurantId).gte('placed_at', monthStart.toISOString()).eq('status', 'delivered'),
        adminSupabase.from('menu_categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        adminSupabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        adminSupabase.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_active', true),
        adminSupabase.from('staff_shifts').select('id, clock_in, users(full_name, roles(name))').eq('restaurant_id', restaurantId).is('clock_out', null).order('clock_in', { ascending: false }),
        adminSupabase.from('ingredients').select('id, name, stock_quantity, reorder_level, unit').eq('restaurant_id', restaurantId).eq('is_active', true).not('reorder_level', 'is', null),
        adminSupabase.from('promo_codes').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_active', true),
        adminSupabase.from('users').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        adminSupabase.from('settings').select('business_hours, features_v2').eq('restaurant_id', restaurantId).maybeSingle(),
    ])

    // Format all amounts in the restaurant's configured currency.
    const currencyFeatures = restaurantSettings?.features_v2 as { currency?: string; currencySymbol?: string | null } | null
    const money = (amount: number) => formatCurrency(amount, currencyFeatures?.currency, currencyFeatures?.currencySymbol)

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
        { done: (menuCategoryCount || 0) > 0, icon: UtensilsCrossed, label: 'Add a menu category', desc: 'Group your dishes into sections', href: '/admin/menu' },
        { done: (menuItemCount || 0) > 0, icon: ClipboardList, label: 'Customize your menu items', desc: 'Set names, prices and photos', href: '/admin/menu' },
        { done: (tableCount || 0) > 0, icon: QrCode, label: 'Review tables & print QR codes', desc: 'Let guests scan to order', href: '/admin/tables' },
        { done: (staffCount || 0) > 1, icon: Users, label: 'Invite your staff', desc: 'Add waiters, kitchen and cashier', href: '/admin/staff' },
        { done: !!restaurantSettings?.business_hours, icon: Clock, label: 'Set business hours & tax', desc: 'Configure opening times and rates', href: '/admin/settings' },
    ]
    const doneSteps = onboardingSteps.filter(s => s.done).length
    const totalSteps = onboardingSteps.length
    const progressPct = Math.round((doneSteps / totalSteps) * 100)
    const showChecklist = doneSteps < totalSteps

    const pipelineSteps: { label: string; count: number; tone: Tone }[] = [
        { label: 'Pending', count: pipeline.pending, tone: 'warning' },
        { label: 'Preparing', count: pipeline.preparing, tone: 'info' },
        { label: 'Ready', count: pipeline.ready, tone: 'success' },
        { label: 'Delivered', count: pipeline.delivered, tone: 'neutral' },
    ]

    const quickActions = [
        { href: '/admin/orders', label: 'View Orders', icon: ClipboardList },
        { href: '/admin/menu', label: 'Edit Menu', icon: UtensilsCrossed },
        { href: '/admin/tables', label: 'Tables & QR', icon: QrCode },
        { href: '/admin/staff', label: 'Staff', icon: Users },
        { href: '/admin/ingredients', label: 'Ingredients', icon: Boxes, badge: lowStock.length || undefined },
        { href: '/admin/promos', label: 'Promo Codes', icon: Tag, badge: activePromos || undefined },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">Today&apos;s Overview</h1>
                <p className="text-body text-ink-muted mt-1.5">Real-time operations snapshot</p>
            </div>

            {/* Onboarding */}
            {showChecklist && (
                <section className="overflow-hidden rounded-[var(--r-lg)] border border-hairline bg-surface shadow-sm">
                    {/* Header with progress */}
                    <div className="relative bg-gradient-to-br from-brand-50 to-surface px-5 sm:px-6 pt-5 pb-5 border-b border-hairline">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="grid size-10 place-items-center rounded-[var(--r-md)] bg-brand-500 text-white shadow-sm shrink-0">
                                    <Rocket size={20} />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-h3 text-ink leading-tight">Get your restaurant ready</h2>
                                    <p className="text-caption text-ink-muted mt-0.5">Finish setup to start taking orders.</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-2xl font-extrabold text-ink tabular-nums leading-none">
                                    {doneSteps}<span className="text-body font-semibold text-ink-subtle">/{totalSteps}</span>
                                </span>
                                <p className="text-caption text-ink-muted mt-1">{progressPct}% done</p>
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 w-full rounded-full bg-[color-mix(in_srgb,var(--brand-500)_14%,var(--surface))] overflow-hidden">
                            <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>

                    {/* Steps */}
                    <ul className="divide-y divide-hairline">
                        {onboardingSteps.map((step, i) => {
                            const Icon = step.icon
                            const inner = (
                                <div className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5">
                                    <span className={`grid size-10 place-items-center rounded-[var(--r-md)] shrink-0 transition-colors ${step.done ? 'bg-success-bg text-success-fg' : 'bg-brand-50 text-brand-700 group-hover:bg-brand-100'}`}>
                                        {step.done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-body font-semibold leading-tight ${step.done ? 'text-ink-subtle line-through' : 'text-ink'}`}>{step.label}</p>
                                        <p className="text-caption text-ink-muted mt-0.5 truncate">{step.desc}</p>
                                    </div>
                                    {step.done ? (
                                        <span className="text-caption font-semibold text-success-fg shrink-0">Done</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-small font-semibold text-brand-700 shrink-0">
                                            <span className="hidden sm:inline">Set up</span>
                                            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    )}
                                </div>
                            )
                            return (
                                <li key={i}>
                                    {step.done
                                        ? inner
                                        : <Link href={step.href} className="group block transition-colors hover:bg-surface-muted">{inner}</Link>}
                                </li>
                            )
                        })}
                    </ul>
                </section>
            )}

            {/* Low stock alert */}
            {lowStock.length > 0 && (
                <div className="flex items-start gap-3 rounded-[var(--r-md)] bg-warning-bg border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] px-4 py-3">
                    <AlertTriangle size={15} className="text-warning-fg shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-small font-semibold text-warning-fg">{lowStock.length} ingredient{lowStock.length > 1 ? 's' : ''} running low</p>
                        <p className="text-caption text-warning-fg/80 mt-0.5">
                            {lowStock.slice(0, 3).map(i => `${i.name} (${i.stock_quantity} ${i.unit})`).join(', ')}
                            {lowStock.length > 3 && ` +${lowStock.length - 3} more`}
                            {' · '}<Link href="/admin/ingredients" className="underline font-medium">View →</Link>
                        </p>
                    </div>
                </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={TrendingUp} tone="brand"   label="Revenue Today"      value={money(totalRevenueToday)} />
                <StatCard icon={ShoppingBag} tone="info"    label="Orders Today"       value={String(totalOrdersToday || 0)} />
                <StatCard icon={Users}       tone="success" label="Active Tables"      value={String(activeSessionCount || 0)} />
                <StatCard icon={TrendingUp}  tone="neutral" label="Revenue This Month" value={money(totalRevenueMonth)} />
                <StatCard icon={UserCheck}   tone="neutral" label="Staff On Shift"     value={String(shifts.length)} />
                <StatCard icon={lowStock.length > 0 ? AlertTriangle : Package} tone={lowStock.length > 0 ? 'warning' : 'neutral'} label="Low Stock Items" value={String(lowStock.length)} />
            </div>

            {/* Pipeline */}
            <Card padding={20}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-h3 text-ink">Today&apos;s Order Pipeline</h2>
                    <Link href="/admin/orders" className="text-small text-brand-700 hover:underline flex items-center gap-1">
                        All Orders <ArrowRight size={12} />
                    </Link>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {pipelineSteps.map((p, i) => (
                        <div key={p.label} className="flex items-center gap-1.5">
                            {i > 0 && <ChevronRight size={14} className="text-ink-subtle/50 hidden sm:block" />}
                            <PipelineSegment label={p.label} count={p.count} tone={p.tone} />
                        </div>
                    ))}
                    <div className="ml-auto">
                        <PipelineSegment label="Cancelled" count={pipeline.cancelled} tone="danger" />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Staff */}
                <Card padding={false} className="overflow-hidden">
                    <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock size={15} className="text-ink-subtle" />
                            <h2 className="text-h3 text-ink">Staff On Shift</h2>
                        </div>
                        <Link href="/admin/shifts" className="text-small text-brand-700 hover:underline">Manage →</Link>
                    </div>
                    <div className="divide-y divide-hairline">
                        {shifts.length === 0 ? (
                            <EmptyState compact icon={UserCheck} title="No one clocked in" description="Active shifts will appear here." />
                        ) : (
                            shifts.slice(0, 5).map(s => {
                                const roleName = (s.users?.roles as unknown as { name: string } | null)?.name || ''
                                const since = new Date(s.clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                return (
                                    <div key={s.id} className="flex items-center gap-3 px-5 h-14">
                                        <div className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-700 text-caption font-bold shrink-0">
                                            {(s.users?.full_name || '?')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-small font-medium text-ink truncate">{s.users?.full_name || '—'}</p>
                                            <p className="text-caption text-ink-subtle capitalize">{roleName.replace('_', ' ')}</p>
                                        </div>
                                        <span className="text-caption text-ink-subtle shrink-0 tabular">since {since}</span>
                                    </div>
                                )
                            })
                        )}
                        {shifts.length > 5 && (
                            <p className="px-5 py-2 text-caption text-ink-subtle text-center">+{shifts.length - 5} more</p>
                        )}
                    </div>
                </Card>

                {/* Quick Actions */}
                <Card padding={false} className="overflow-hidden">
                    <div className="px-5 py-4 border-b border-hairline">
                        <h2 className="text-h3 text-ink">Quick Actions</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {quickActions.map(({ href, label, icon: Icon, badge }) => (
                            <Link
                                key={href}
                                href={href}
                                className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-hairline bg-surface px-3 py-4 text-center transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50"
                            >
                                <Icon size={20} className="text-ink-muted group-hover:text-brand-600 transition-colors" />
                                <span className="text-caption font-semibold text-ink">{label}</span>
                                {badge !== undefined && badge > 0 && (
                                    <span className="absolute top-2 right-2 grid size-4 place-items-center rounded-full bg-warning text-white text-[9px] font-bold tabular">
                                        {badge > 9 ? '9+' : badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Recent Orders */}
            <Card padding={false} className="overflow-hidden">
                <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
                    <h2 className="text-h3 text-ink">Recent Orders</h2>
                    <Link href="/admin/orders" className="text-small text-brand-700 hover:underline flex items-center gap-1">
                        View All <ArrowRight size={12} />
                    </Link>
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-label text-ink-subtle border-b border-hairline bg-surface-muted/40">
                                <th className="px-5 py-3 text-left font-semibold">Order ID</th>
                                <th className="px-5 py-3 text-left font-semibold">Time</th>
                                <th className="px-5 py-3 text-left font-semibold">Status</th>
                                <th className="px-5 py-3 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {recentOrders?.map(order => (
                                <tr key={order.id} className="h-12 hover:bg-surface-muted/50 transition-colors">
                                    <td className="px-5 font-mono text-caption font-semibold text-ink">{order.id.substring(0, 8).toUpperCase()}</td>
                                    <td className="px-5 text-caption text-ink-subtle tabular">{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-5"><StatusBadge status={order.status} /></td>
                                    <td className="px-5 text-right text-small font-semibold text-ink tabular">{money(order.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!recentOrders || recentOrders.length === 0) && (
                        <EmptyState icon={Inbox} title="No orders yet today" description="New orders will show up here as they come in." />
                    )}
                </div>
                <div className="md:hidden divide-y divide-hairline">
                    {recentOrders?.map(order => (
                        <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-mono text-small font-bold text-ink">#{order.id.substring(0, 6).toUpperCase()}</p>
                                <p className="text-caption text-ink-subtle mt-0.5 tabular">{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <StatusBadge status={order.status} />
                            <p className="font-bold text-ink tabular shrink-0">{money(order.total_amount)}</p>
                        </div>
                    ))}
                    {(!recentOrders || recentOrders.length === 0) && (
                        <EmptyState icon={Inbox} title="No orders yet today" />
                    )}
                </div>
            </Card>
        </div>
    )
}

function PipelineSegment({ label, count, tone }: { label: string; count: number; tone: Tone }) {
    const TONE: Record<Tone, string> = {
        warning: 'bg-warning-bg text-warning-fg',
        info: 'bg-info-bg text-info-fg',
        success: 'bg-success-bg text-success-fg',
        danger: 'bg-danger-bg text-danger-fg',
        neutral: 'bg-[var(--neutral-badge-bg)] text-[var(--neutral-badge-fg)]',
        brand: 'bg-brand-50 text-brand-700',
    }
    return (
        <div className={`flex items-center gap-1.5 rounded-[var(--r-md)] px-3 py-1.5 text-caption font-semibold ${TONE[tone]}`}>
            <span className="text-small font-bold tabular">{count}</span>
            <span className="hidden sm:inline">{label}</span>
        </div>
    )
}
