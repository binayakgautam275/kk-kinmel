import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react'
import RevenueTrendChart from '@/components/admin/RevenueTrendChart'

export const revalidate = 60 // Cache analytics for 60 seconds

export default async function AnalyticsPage() {
    const { restaurantId } = await getCurrentUser()

    const supabase = await createServerClient()

    // Date ranges
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    // Concurrently fetch aggregate metrics
    // In a real production app, you would use PG Materialized Views or Edge Functions for complex aggregations.
    // Previous 7-day period for trend comparison
    const prevWeekStart = new Date(lastWeek)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)

    const [
        { data: activeOrders },
        { data: completedOrders },
        { count: totalSessionsLimit },
        { data: prevCompletedOrders },
    ] = await Promise.all([
        // Active orders (pending -> preparing)
        supabase
            .from('orders')
            .select('id, total_amount, status')
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready']),

        // Completed orders in the last 7 days
        supabase
            .from('orders')
            .select('id, total_amount, placed_at')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'delivered')
            .gte('placed_at', lastWeek.toISOString()),

        // Total sessions created today
        supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .gte('opened_at', today.toISOString()),

        // Previous 7 days (for trend comparison)
        supabase
            .from('orders')
            .select('id, total_amount')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'delivered')
            .gte('placed_at', prevWeekStart.toISOString())
            .lt('placed_at', lastWeek.toISOString()),
    ])

    // Aggregate calculations
    const totalRevenue7d = completedOrders?.reduce((acc, order) => acc + (order.total_amount || 0), 0) || 0
    const orderCount7d = completedOrders?.length || 0
    const avgOrderValue = orderCount7d > 0 ? totalRevenue7d / orderCount7d : 0

    // Previous period calculations for real trend comparison
    const prevRevenue7d = prevCompletedOrders?.reduce((acc, order) => acc + (order.total_amount || 0), 0) || 0
    const prevOrderCount7d = prevCompletedOrders?.length || 0
    const prevAvgOrderValue = prevOrderCount7d > 0 ? prevRevenue7d / prevOrderCount7d : 0

    function calcTrend(current: number, previous: number): { text: string; positive: boolean } {
        if (previous === 0) return { text: current > 0 ? 'New' : '0%', positive: current >= 0 }
        const pct = ((current - previous) / previous) * 100
        const sign = pct >= 0 ? '+' : ''
        return { text: `${sign}${pct.toFixed(1)}%`, positive: pct >= 0 }
    }

    const revTrend = calcTrend(totalRevenue7d, prevRevenue7d)
    const orderTrend = calcTrend(orderCount7d, prevOrderCount7d)
    const aovTrend = calcTrend(avgOrderValue, prevAvgOrderValue)

    // Build 7-day daily buckets for the chart
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dailyBuckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lastWeek)
        d.setDate(d.getDate() + i)
        return {
            date: d.toISOString().slice(0, 10),
            label: DAY_NAMES[d.getDay()],
            revenue: 0,
            orders: 0,
        }
    })
    for (const order of completedOrders || []) {
        const day = order.placed_at.slice(0, 10)
        const bucket = dailyBuckets.find(b => b.date === day)
        if (bucket) {
            bucket.revenue += order.total_amount || 0
            bucket.orders += 1
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
                    <p className="text-gray-500 mt-1">Review your restaurant&apos;s performance metrics and KPIs.</p>
                </div>
                <div className="text-sm text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    icon={<DollarSign />}
                    title="Revenue (7 Days)"
                    value={formatCurrency(totalRevenue7d)}
                    trend={revTrend.text}
                    positive={revTrend.positive}
                    color="blue"
                />
                <MetricCard
                    icon={<ShoppingCart />}
                    title="Orders (7 Days)"
                    value={orderCount7d.toString()}
                    trend={orderTrend.text}
                    positive={orderTrend.positive}
                    color="emerald"
                />
                <MetricCard
                    icon={<TrendingUp />}
                    title="Average Order Value"
                    value={formatCurrency(avgOrderValue)}
                    trend={aovTrend.text}
                    positive={aovTrend.positive}
                    color="purple"
                />
                <MetricCard
                    icon={<Users />}
                    title="Sessions Today"
                    value={totalSessionsLimit?.toString() || '0'}
                    trend="Today"
                    positive={true}
                    color="orange"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Revenue Trend</h3>
                    <p className="text-xs text-gray-400 mb-4">Last 7 days — delivered orders only</p>
                    <div className="flex-1">
                        <RevenueTrendChart days={dailyBuckets} />
                    </div>
                </div>

                {/* Active Flow Pipeline */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Live Kitchen Pipeline</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <span className="font-medium text-orange-800">Pending & Confirmed</span>
                            <span className="text-2xl font-bold text-orange-600">
                                {activeOrders?.filter(o => ['pending', 'confirmed'].includes(o.status)).length || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="font-medium text-blue-800">Preparing in Kitchen</span>
                            <span className="text-2xl font-bold text-blue-600">
                                {activeOrders?.filter(o => o.status === 'preparing').length || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="font-medium text-emerald-800">Ready for Waiter</span>
                            <span className="text-2xl font-bold text-emerald-600">
                                {activeOrders?.filter(o => o.status === 'ready').length || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ icon, title, value, trend, positive, color }: {
    icon: React.ReactNode,
    title: string,
    value: string,
    trend: string,
    positive: boolean,
    color: 'blue' | 'emerald' | 'purple' | 'orange'
}) {
    const colorMap = {
        blue: 'text-blue-600 bg-blue-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        purple: 'text-purple-600 bg-purple-50',
        orange: 'text-orange-600 bg-orange-50',
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-lg ${colorMap[color]}`}>
                    {icon}
                </div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
            </div>
            <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md ${positive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                    {trend}
                </div>
            </div>
        </div>
    )
}
