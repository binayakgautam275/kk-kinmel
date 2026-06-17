import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import RefundOrderButton from './RefundOrderButton'

export const dynamic = 'force-dynamic'

type AdminOrder = {
    id: string
    status: string
    payment_status: string
    total_amount: number | null
    refunded_amount: number | null
    placed_at: string
    customer_note: string | null
    sessions: { tables: { label: string } | null } | null
    order_items: { id: string; quantity: number; menu_items: { name: string } | null }[]
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    preparing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    ready: 'bg-green-100 text-green-700 border-green-200',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const PAY_COLORS: Record<string, string> = {
    unpaid: 'text-amber-600',
    paid: 'text-green-700',
    refunded: 'text-red-500',
}

export default async function AdminOrdersPage() {
    const { restaurantId, role } = await getCurrentUser()
    const canRefund = role === 'manager' || role === 'super_admin'

    const adminSupabase = await createAdminClient()

    const { data: orders } = await adminSupabase
        .from('orders')
        .select(`
            id, status, payment_status, total_amount, refunded_amount, placed_at, customer_note,
            sessions ( tables ( label ) ),
            order_items ( id, quantity, menu_items ( name ) )
        `)
        .eq('restaurant_id', restaurantId)
        .order('placed_at', { ascending: false })
        .limit(100) as { data: AdminOrder[] | null }

    return (
        <div className="space-y-4 md:space-y-6">
            <header>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Order History</h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">View and manage all orders. Managers can void or refund orders.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <ShoppingBag size={18} /> All Orders ({orders?.length || 0})
                    </h3>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b border-gray-100 font-semibold">
                            <tr>
                                <th className="px-6 py-3">Order</th>
                                <th className="px-6 py-3">Table</th>
                                <th className="px-6 py-3">Items</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Payment</th>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                                {canRefund && <th className="px-6 py-3" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {orders?.map((order) => {
                                const tableLabel = order.sessions?.tables?.label || '—'
                                const itemCount = order.order_items?.length || 0
                                const itemNames = order.order_items?.map((i) => `${i.quantity}x ${i.menu_items?.name}`).join(', ') || '—'
                                const refundable = canRefund && ['paid', 'unpaid'].includes(order.payment_status) && order.status !== 'cancelled'

                                return (
                                    <tr key={order.id} className={`hover:bg-gray-50/50 transition ${order.payment_status === 'refunded' ? 'opacity-60' : ''}`}>
                                        <td className="px-6 py-4 font-mono font-bold text-gray-900 text-xs">
                                            #{order.id.substring(0, 8).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-700">{tableLabel}</td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={itemNames}>
                                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-semibold uppercase ${PAY_COLORS[order.payment_status] || 'text-gray-500'}`}>
                                                {order.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {new Date(order.placed_at).toLocaleDateString()} {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            <span className={order.payment_status === 'refunded' ? 'line-through text-gray-400' : ''}>
                                                {formatCurrency(order.total_amount ?? 0)}
                                            </span>
                                        </td>
                                        {canRefund && (
                                            <td className="px-4 py-4">
                                                {refundable && (
                                                    <RefundOrderButton orderId={order.id} paymentStatus={order.payment_status} totalAmount={order.total_amount ?? 0} refundedAmount={order.refunded_amount ?? 0} />
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                            {(!orders || orders.length === 0) && (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">No orders found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-gray-100">
                    {orders?.map((order) => {
                        const tableLabel = order.sessions?.tables?.label || '—'
                        const itemNames = order.order_items?.map((i) => `${i.quantity}x ${i.menu_items?.name}`).join(', ') || ''
                        const refundable = canRefund && ['paid', 'unpaid'].includes(order.payment_status) && order.status !== 'cancelled'

                        return (
                            <div key={order.id} className={`p-4 space-y-2 ${order.payment_status === 'refunded' ? 'opacity-60' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="font-mono text-xs font-bold text-gray-900">#{order.id.substring(0, 8).toUpperCase()}</div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold uppercase ${PAY_COLORS[order.payment_status] || 'text-gray-500'}`}>
                                            {order.payment_status}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Table {tableLabel}</span>
                                    <span className={`font-bold ${order.payment_status === 'refunded' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                        {formatCurrency(order.total_amount ?? 0)}
                                    </span>
                                </div>
                                {itemNames && <p className="text-xs text-gray-400 truncate">{itemNames}</p>}
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] text-gray-400">
                                        {new Date(order.placed_at).toLocaleDateString()} · {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {refundable && <RefundOrderButton orderId={order.id} paymentStatus={order.payment_status} totalAmount={order.total_amount ?? 0} refundedAmount={order.refunded_amount ?? 0} />}
                                </div>
                            </div>
                        )
                    })}
                    {(!orders || orders.length === 0) && (
                        <div className="p-8 text-center text-gray-500">No orders found.</div>
                    )}
                </div>
            </div>
        </div>
    )
}
