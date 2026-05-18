import { createServerClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Users, ShoppingBag, Clock } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'

export const revalidate = 0

export default async function AdminDashboardPage() {
    const { restaurantId } = await getCurrentUser()

    const supabase = await createServerClient()

    // Fetch simple aggregate data for the dashboard
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
        { count: totalOrdersToday },
        { data: activeSessions },
        { data: recentOrders },
        { data: todayDeliveredOrders },
        { count: menuCategoryCount },
        { count: menuItemCount },
        { count: tableCount },
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
            .limit(5),
        // Actual revenue: only count delivered orders (completed & served)
        supabase
            .from('orders')
            .select('total_amount')
            .eq('restaurant_id', restaurantId)
            .gte('placed_at', today.toISOString())
            .eq('status', 'delivered'),
        supabase.from('menu_categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_active', true),
    ])

    // Actual revenue from all of today's non-cancelled orders
    const totalRevenueToday = todayDeliveredOrders?.reduce(
        (acc, order) => acc + (order.total_amount || 0), 0
    ) || 0

    // Onboarding checklist: show until all 3 steps are done
    const onboardingSteps = [
        { done: (menuCategoryCount || 0) > 0, label: 'Add your first menu category', href: '/admin/menu' },
        { done: (menuItemCount || 0) > 0, label: 'Add your first menu item', href: '/admin/menu' },
        { done: (tableCount || 0) > 0, label: 'Create a table and generate a QR code', href: '/admin/tables' },
    ]
    const showChecklist = onboardingSteps.some(s => !s.done)

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Today&apos;s Overview</h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">Real-time performance metrics.</p>
            </div>

            {/* Onboarding Checklist — shown until setup is complete */}
            {showChecklist && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <h2 className="font-bold text-blue-900 text-base mb-3">🚀 Get your restaurant ready</h2>
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

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="bg-white p-3 md:p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 md:gap-4">
                    <div className="bg-blue-50 p-2.5 md:p-4 rounded-full text-blue-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wide">Revenue Today</p>
                        <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(totalRevenueToday)}</p>
                    </div>
                </div>

                <div className="bg-white p-3 md:p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 md:gap-4">
                    <div className="bg-green-50 p-2.5 md:p-4 rounded-full text-green-600">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wide">Orders Today</p>
                        <p className="text-lg md:text-2xl font-bold text-gray-900">{totalOrdersToday || 0}</p>
                    </div>
                </div>

                <div className="bg-white p-3 md:p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 md:gap-4">
                    <div className="bg-purple-50 p-2.5 md:p-4 rounded-full text-purple-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wide">Active Tables</p>
                        <p className="text-lg md:text-2xl font-bold text-gray-900">{activeSessions?.length || 0}</p>
                    </div>
                </div>

                <div className="bg-white p-3 md:p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 md:gap-4">
                    <div className="bg-orange-50 p-2.5 md:p-4 rounded-full text-orange-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wide">Avg Prep Time</p>
                        <p className="text-lg md:text-2xl font-bold text-gray-900">—</p>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Recent Orders</h2>
                </div>

                {/* Desktop table — hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Order ID</th>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders?.map((order) => (
                                <tr key={order.id} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition">
                                    <td className="px-6 py-4 font-mono font-medium text-gray-900">{order.id.substring(0, 8).toUpperCase()}</td>
                                    <td className="px-6 py-4">{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' : order.status === 'ready' ? 'bg-blue-50 text-blue-700 border-blue-200' : order.status === 'preparing' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(order.total_amount)}</td>
                                </tr>
                            ))}
                            {(!recentOrders || recentOrders.length === 0) && (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No recent orders found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-gray-100">
                    {recentOrders?.map((order) => (
                        <div key={order.id} className="p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-mono text-sm font-bold text-gray-900">#{order.id.substring(0, 6).toUpperCase()}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' : order.status === 'ready' ? 'bg-blue-50 text-blue-700 border-blue-200' : order.status === 'preparing' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                {order.status}
                            </span>
                            <div className="font-bold text-gray-900 text-sm shrink-0">{formatCurrency(order.total_amount)}</div>
                        </div>
                    ))}
                    {(!recentOrders || recentOrders.length === 0) && (
                        <div className="p-8 text-center text-gray-500">No recent orders found.</div>
                    )}
                </div>
            </div>
        </div>
    )
}
