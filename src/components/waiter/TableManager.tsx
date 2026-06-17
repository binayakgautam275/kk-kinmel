'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { openSession, closeSession, setTableStatus } from '@/app/(staff)/waiter/actions'
import { Users, QrCode, PowerOff, Power, Sparkles, CalendarClock, UtensilsCrossed } from 'lucide-react'
import type { Table, Session } from '@/types/database'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-hot-toast'
import { useConfirmStore } from '@/lib/stores/confirm'

export type TableWithSession = Table & { activeSession?: Session | null }

const STATUS_CONFIG = {
    active:    { dot: 'bg-emerald-400 animate-pulse', card: 'border-emerald-300 bg-emerald-50/60', label: 'Active', labelCls: 'text-emerald-700' },
    dirty:     { dot: 'bg-amber-400',  card: 'border-amber-200 bg-amber-50/60',   label: 'Dirty',    labelCls: 'text-amber-700' },
    reserved:  { dot: 'bg-blue-400',   card: 'border-blue-200 bg-blue-50/60',     label: 'Reserved', labelCls: 'text-blue-700' },
    available: { dot: 'bg-gray-300',   card: 'border-gray-200 bg-white',           label: '',         labelCls: '' },
}

function getEffectiveStatus(table: TableWithSession): string {
    if (table.activeSession) return 'active'
    return table.table_status || 'available'
}

export default function TableManager({ initialTables, restaurantId, appUrl, initialOrders = [] }: {
    initialTables: TableWithSession[]
    restaurantId: string
    appUrl: string
    initialOrders?: { id: string; session_id: string | null; status: string }[]
}) {
    const [tables, setTables] = useState<TableWithSession[]>(initialTables)
    const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const supabaseRef = useRef(createClient())
    const { confirm } = useConfirmStore()

    // Track order statuses per order ID → { session_id, status }
    const [orderStatuses, setOrderStatuses] = useState<Record<string, { session_id: string | null; status: string }>>(() => {
        const m: Record<string, { session_id: string | null; status: string }> = {}
        for (const o of initialOrders) m[o.id] = { session_id: o.session_id, status: o.status }
        return m
    })

    // Use actual browser origin so QR codes encode the live URL, not localhost
    const [baseUrl, setBaseUrl] = useState(appUrl)
    useEffect(() => { setBaseUrl(window.location.origin) }, [])

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`waiter-sessions-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const { id, session_id, status } = payload.new
                    setOrderStatuses(prev => ({ ...prev, [id]: { session_id, status } }))
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const { id, session_id, status } = payload.new
                    if (status === 'delivered' || status === 'cancelled') {
                        setOrderStatuses(prev => { const n = { ...prev }; delete n[id]; return n })
                    } else {
                        setOrderStatuses(prev => ({ ...prev, [id]: { session_id, status } }))
                    }
                }
            )
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const s = payload.new as Session
                    setTables(prev => prev.map(t => t.id === s.table_id ? { ...t, activeSession: s } : t))
                    setSelectedTable(prev => prev?.id === s.table_id ? { ...prev, activeSession: s } : prev)
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const s = payload.new as Session
                    const isClosed = s.status === 'closed' || s.status === 'expired'
                    setTables(prev => prev.map(t => t.activeSession?.id === s.id ? { ...t, activeSession: isClosed ? null : s } : t))
                    setSelectedTable(prev => prev?.activeSession?.id === s.id ? { ...prev, activeSession: isClosed ? null : s } : prev)
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const u = payload.new as TableWithSession
                    setTables(prev => prev.map(t => t.id === u.id ? { ...t, table_status: u.table_status } : t))
                    setSelectedTable(prev => prev?.id === u.id ? { ...prev, table_status: u.table_status } : prev)
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    const handleOpenSession = async (tableId: string) => {
        setIsProcessing(true)
        await openSession(tableId, restaurantId)
        await setTableStatus(tableId, 'available')
        toast.success('Session opened')
        setIsProcessing(false)
    }

    const handleCloseSession = async (sessionId: string) => {
        const ok = await confirm({
            title: 'Close Session?',
            message: 'Customers will no longer be able to order and the table will be cleared.',
            confirmText: 'Close Session',
            isDestructive: true,
        })
        if (!ok) return
        setIsProcessing(true)
        await closeSession(sessionId)
        toast.success('Session closed')
        setIsProcessing(false)
        setSelectedTable(null)
    }

    const handleSetStatus = async (tableId: string, status: 'available' | 'dirty' | 'reserved') => {
        setIsProcessing(true)
        const res = await setTableStatus(tableId, status)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(status === 'dirty' ? 'Marked dirty' : status === 'reserved' ? 'Reserved' : 'Cleared')
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, table_status: status } : t))
            setSelectedTable(prev => prev?.id === tableId ? { ...prev, table_status: status } : prev)
        }
        setIsProcessing(false)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Table Grid */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UtensilsCrossed size={15} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900 text-sm">Floor Plan</h2>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'available').map(([key, cfg]) => (
                            <span key={key} className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${cfg.dot.replace(' animate-pulse', '')}`} />
                                {cfg.label}
                            </span>
                        ))}
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-gray-300" />Available
                        </span>
                    </div>
                </div>

                <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {tables.map(table => {
                        const status = getEffectiveStatus(table)
                        const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available
                        const isSelected = selectedTable?.id === table.id

                        // Traffic light: order pipeline status for this table's session
                        const sessionId = table.activeSession?.id ?? null
                        const sessionOrders = sessionId
                            ? Object.values(orderStatuses).filter(o => o.session_id === sessionId && !['delivered', 'cancelled'].includes(o.status))
                            : []
                        const orderLight = sessionOrders.some(o => o.status === 'ready')
                            ? 'ready'
                            : sessionOrders.some(o => o.status === 'preparing' || o.status === 'confirmed')
                                ? 'preparing'
                                : sessionOrders.length > 0 ? 'pending' : null

                        const trafficLight = {
                            ready:    { dot: 'bg-emerald-500 animate-pulse', label: '● Ready', cls: 'text-emerald-600' },
                            preparing:{ dot: 'bg-orange-400 animate-pulse',  label: '● Cooking', cls: 'text-orange-600' },
                            pending:  { dot: 'bg-amber-300',                 label: '● Waiting', cls: 'text-amber-600' },
                        }
                        const tl = orderLight ? trafficLight[orderLight] : null

                        return (
                            <button
                                key={table.id}
                                onClick={() => setSelectedTable(isSelected ? null : table)}
                                className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-150 ${cfg.card} ${
                                    isSelected ? 'ring-2 ring-offset-1 ring-[var(--color-primary)] scale-105 z-10 shadow-md' : 'hover:scale-[1.03] hover:shadow-sm active:scale-95'
                                }`}
                            >
                                <span className="text-xl font-bold text-gray-800">{table.label}</span>
                                {table.capacity && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-gray-400 mt-0.5">
                                        <Users size={9} />{table.capacity}
                                    </span>
                                )}
                                {tl ? (
                                    <span className={`text-[9px] font-bold mt-0.5 ${tl.cls}`}>{tl.label}</span>
                                ) : cfg.label ? (
                                    <span className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${cfg.labelCls}`}>{cfg.label}</span>
                                ) : null}
                                {/* Session status dot (top-right) */}
                                <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />
                                {/* Order traffic light dot (top-left) */}
                                {tl && <span className={`absolute top-1.5 left-1.5 w-2 h-2 rounded-full ${tl.dot}`} />}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Action Panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-20 h-fit">
                {selectedTable ? (
                    <div>
                        <div className="px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900">Table {selectedTable.label}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {selectedTable.activeSession
                                            ? 'Session active'
                                            : selectedTable.table_status === 'dirty'
                                                ? 'Needs cleaning'
                                                : selectedTable.table_status === 'reserved'
                                                    ? 'Reserved'
                                                    : 'Available'}
                                    </p>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${(STATUS_CONFIG[getEffectiveStatus(selectedTable) as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available).dot}`} />
                            </div>
                        </div>

                        <div className="p-5">
                            {selectedTable.activeSession ? (
                                <div className="space-y-4">
                                    <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <QRCodeSVG
                                            value={`${baseUrl}/t/${selectedTable.qr_token}?s=${selectedTable.activeSession.session_token}`}
                                            size={180}
                                            level="Q"
                                            includeMargin
                                        />
                                    </div>
                                    <p className="text-xs text-center text-gray-400">Scan to order · Session valid for 4 hours</p>
                                    <button
                                        onClick={() => handleCloseSession(selectedTable.activeSession!.id)}
                                        disabled={isProcessing}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 border border-red-200 font-semibold text-sm rounded-xl hover:bg-red-100 active:scale-[0.98] disabled:opacity-50 transition"
                                    >
                                        <PowerOff size={15} /> Close Session & Checkout
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center py-4 text-gray-200">
                                        <QrCode size={64} strokeWidth={1} />
                                        <p className="text-center text-xs text-gray-400 mt-3">Seat customers and open a session to generate an ordering QR code.</p>
                                    </div>
                                    <button
                                        onClick={() => handleOpenSession(selectedTable.id)}
                                        disabled={isProcessing}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-secondary)] text-white font-semibold text-sm rounded-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition shadow-sm"
                                    >
                                        <Power size={15} /> Open Session
                                    </button>

                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Table Status</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { status: 'available' as const, icon: <span className="w-2.5 h-2.5 rounded-full bg-gray-300 block" />, label: 'Clear', cls: 'border-gray-200 text-gray-600 hover:bg-gray-50' },
                                                { status: 'dirty' as const,     icon: <Sparkles size={12} />, label: 'Dirty',   cls: 'border-amber-200 text-amber-600 hover:bg-amber-50' },
                                                { status: 'reserved' as const,  icon: <CalendarClock size={12} />, label: 'Reserve', cls: 'border-blue-200 text-blue-600 hover:bg-blue-50' },
                                            ].map(({ status, icon, label, cls }) => (
                                                <button
                                                    key={status}
                                                    onClick={() => handleSetStatus(selectedTable.id, status)}
                                                    disabled={isProcessing || (!selectedTable.table_status || selectedTable.table_status === status) && status === 'available'}
                                                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-semibold disabled:opacity-40 transition active:scale-95 ${cls}`}
                                                >
                                                    {icon}{label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-300 p-6">
                        <UtensilsCrossed size={40} strokeWidth={1.5} className="mb-3" />
                        <p className="text-sm text-gray-400 font-medium">Select a table</p>
                        <p className="text-xs text-gray-300 mt-1">Tap any table to manage it</p>
                    </div>
                )}
            </div>
        </div>
    )
}
