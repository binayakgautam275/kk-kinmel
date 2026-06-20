'use client'

import { useState } from 'react'
import { useRestaurantTable } from '@/lib/realtime/useRestaurantTable'
import { Clock, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export interface ActiveTableEntry {
    tableId: string
    tableLabel: string
    sessionId: string
    openedAt: string
    orderCount: number
    totalAmount: number
}

interface Props {
    initialEntries: ActiveTableEntry[]
    tablesMap: Record<string, string>
    restaurantId: string
}

export default function ActiveSessionsList({ initialEntries, tablesMap, restaurantId }: Props) {
    const [entries, setEntries] = useState<ActiveTableEntry[]>(initialEntries)

    useRestaurantTable(restaurantId, 'sessions', (payload) => {
        if (payload.eventType === 'INSERT') {
            const s = payload.new as { id: string; table_id: string; opened_at: string; status: string }
            if (s.status !== 'active') return
            const tableLabel = tablesMap[s.table_id] ?? '?'
            setEntries(prev => [
                { tableId: s.table_id, tableLabel, sessionId: s.id, openedAt: s.opened_at, orderCount: 0, totalAmount: 0 },
                ...prev,
            ])
        } else if (payload.eventType === 'UPDATE') {
            const s = payload.new as { id: string; status: string }
            if (s.status === 'closed' || s.status === 'expired') {
                setEntries(prev => prev.filter(e => e.sessionId !== s.id))
            }
        }
    })

    useRestaurantTable(restaurantId, 'orders', (payload) => {
        if (payload.eventType === 'INSERT') {
            const o = payload.new as { session_id: string; total_amount: number; status: string }
            if (!['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)) return
            setEntries(prev => prev.map(e =>
                e.sessionId === o.session_id
                    ? { ...e, orderCount: e.orderCount + 1, totalAmount: e.totalAmount + Number(o.total_amount) }
                    : e
            ))
        } else if (payload.eventType === 'UPDATE') {
            const next = payload.new as { session_id: string; total_amount: number; status: string }
            const prev = payload.old as { status: string; total_amount: number }
            if (['delivered', 'cancelled'].includes(next.status) && !['delivered', 'cancelled'].includes(prev.status)) {
                setEntries(es => es.map(e =>
                    e.sessionId === next.session_id
                        ? { ...e, orderCount: Math.max(0, e.orderCount - 1), totalAmount: Math.max(0, e.totalAmount - Number(prev.total_amount)) }
                        : e
                ))
            }
        }
    })

    if (entries.length === 0) return null

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <UtensilsCrossed size={15} className="text-emerald-500" />
                <h2 className="font-semibold text-gray-900 text-sm">Active Sessions</h2>
                <span className="ml-auto text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    {entries.length} open
                </span>
            </div>

            <div className="divide-y divide-gray-50">
                {entries.map(entry => (
                    <div key={entry.sessionId} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-emerald-700">{entry.tableLabel}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900">Table {entry.tableLabel}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                    <Clock size={10} />
                                    {timeAgo(entry.openedAt)}
                                </span>
                                {entry.orderCount > 0 && (
                                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                        <ShoppingBag size={10} />
                                        {entry.orderCount} {entry.orderCount === 1 ? 'order' : 'orders'}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            {entry.totalAmount > 0 ? (
                                <span className="text-sm font-bold text-gray-800 tabular-nums">
                                    Rs. {entry.totalAmount.toFixed(0)}
                                </span>
                            ) : (
                                <span className="text-[11px] text-gray-300 font-medium">No orders</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
