'use client'

import { useMemo, useState } from 'react'
import { ShoppingBag, Search, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import RefundOrderButton from './RefundOrderButton'

export type AdminOrder = {
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

const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
const PAYMENTS = ['unpaid', 'paid', 'refunded']

const selectClass = 'h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]'

export default function OrdersClient({ orders, canRefund }: { orders: AdminOrder[]; canRefund: boolean }) {
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [payment, setPayment] = useState('all')
    const [dateRange, setDateRange] = useState('all')
    // Seeded once on mount so the filter memo stays a pure computation.
    const [now] = useState(() => Date.now())

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return orders.filter(o => {
            if (status !== 'all' && o.status !== status) return false
            if (payment !== 'all' && o.payment_status !== payment) return false
            if (dateRange === 'today') {
                const today = new Date(now); today.setHours(0, 0, 0, 0)
                if (new Date(o.placed_at) < today) return false
            } else if (dateRange === '7d') {
                if (now - new Date(o.placed_at).getTime() > 7 * 24 * 3600 * 1000) return false
            } else if (dateRange === '30d') {
                if (now - new Date(o.placed_at).getTime() > 30 * 24 * 3600 * 1000) return false
            }
            if (q) {
                const idMatch = o.id.toLowerCase().includes(q)
                const tableMatch = (o.sessions?.tables?.label || '').toLowerCase().includes(q)
                const itemMatch = o.order_items?.some(i => (i.menu_items?.name || '').toLowerCase().includes(q))
                if (!idMatch && !tableMatch && !itemMatch) return false
            }
            return true
        })
    }, [orders, search, status, payment, dateRange, now])

    const revenue = filtered.reduce((s, o) => s + (o.payment_status === 'refunded' ? 0 : (o.total_amount ?? 0)), 0)
    const hasActiveFilters = search.trim() !== '' || status !== 'all' || payment !== 'all' || dateRange !== 'all'

    const clearFilters = () => { setSearch(''); setStatus('all'); setPayment('all'); setDateRange('all') }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header + summary */}
            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3 justify-between">
                <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <ShoppingBag size={18} /> All Orders
                    <span className="text-sm font-normal text-gray-400">({filtered.length}{filtered.length !== orders.length ? ` of ${orders.length}` : ''})</span>
                </h3>
                <div className="text-sm text-gray-500">
                    Total: <strong className="text-gray-900">{formatCurrency(revenue)}</strong>
                </div>
            </div>

            {/* Filters */}
            <div className="p-3 md:p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search order #, table or item…"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
                    />
                </div>
                <div className="grid grid-cols-3 sm:flex gap-2">
                    <select value={status} onChange={e => setStatus(e.target.value)} className={selectClass} aria-label="Filter by status">
                        <option value="all">All Status</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <select value={payment} onChange={e => setPayment(e.target.value)} className={selectClass} aria-label="Filter by payment">
                        <option value="all">All Payment</option>
                        {PAYMENTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                    <select value={dateRange} onChange={e => setDateRange(e.target.value)} className={selectClass} aria-label="Filter by date">
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="h-10 px-3 inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
                        <X size={14} /> Clear
                    </button>
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b border-gray-100 font-semibold sticky top-0 z-10">
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
                        {filtered.map((order) => {
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
                                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                                        {new Date(order.placed_at).toLocaleDateString()} {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
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
                        {filtered.length === 0 && (
                            <tr><td colSpan={canRefund ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
                                {orders.length === 0 ? 'No orders found.' : 'No orders match your filters.'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-gray-100">
                {filtered.map((order) => {
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
                {filtered.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        {orders.length === 0 ? 'No orders found.' : 'No orders match your filters.'}
                    </div>
                )}
            </div>
        </div>
    )
}
