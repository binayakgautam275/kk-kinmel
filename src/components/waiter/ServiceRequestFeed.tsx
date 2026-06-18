'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { acknowledgeServiceRequest, completeServiceRequest } from '@/app/api/service-requests/actions'
import { Bell, Droplets, Receipt, Sparkles, MessageCircle, LogIn } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { playServiceRequest } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import type { ServiceRequest, ServiceRequestType } from '@/types/database'
import { openSessionFromRequest } from '@/app/(staff)/waiter/actions'

const ICON_MAP: Record<ServiceRequestType, typeof Bell> = {
    call_waiter: Bell,
    request_bill: Receipt,
    need_water: Droplets,
    clean_table: Sparkles,
    other: MessageCircle,
    open_session: LogIn,
}

const LABEL_MAP: Record<ServiceRequestType, string> = {
    call_waiter: 'Call Waiter',
    request_bill: 'Request Bill',
    need_water: 'Need Water',
    clean_table: 'Clean Table',
    other: 'Other',
    open_session: 'Ready to Order',
}

const COLOR_MAP: Record<ServiceRequestType, string> = {
    call_waiter: 'bg-blue-100 text-blue-600',
    request_bill: 'bg-emerald-100 text-emerald-600',
    need_water: 'bg-cyan-100 text-cyan-600',
    clean_table: 'bg-amber-100 text-amber-600',
    other: 'bg-gray-100 text-gray-600',
    open_session: 'bg-violet-100 text-violet-600',
}

type ServiceRequestWithTable = ServiceRequest & {
    sessions?: { tables?: { label?: string } }
    direct_table?: { label?: string }
}

const getTableLabel = (req: ServiceRequestWithTable) =>
    req.sessions?.tables?.label ?? req.direct_table?.label ?? '?'

export default function ServiceRequestFeed({
    initialRequests,
    restaurantId,
    userId,
}: {
    initialRequests: ServiceRequestWithTable[]
    restaurantId: string
    userId: string
}) {
    const [requests, setRequests] = useState<ServiceRequestWithTable[]>(initialRequests)
    const [openingSession, setOpeningSession] = useState<string | null>(null)
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`service-requests-${restaurantId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    const { data } = await supabase
                        .from('service_requests')
                        .select('*, sessions ( tables ( label ) ), direct_table:tables ( label )')
                        .eq('id', payload.new.id)
                        .single()
                    if (data) {
                        const req = data as unknown as ServiceRequestWithTable
                        setRequests((prev) => [req, ...prev])
                        playServiceRequest().catch(() => {})
                        const tableLabel = getTableLabel(req)
                        const label = LABEL_MAP[req.request_type as ServiceRequestType] || 'Service Request'
                        const isOpenSession = req.request_type === 'open_session'
                        toast.custom((t) => (
                            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-gray-900 text-white shadow-2xl rounded-xl px-4 py-3 flex items-start gap-3 ${isOpenSession ? 'border border-violet-500/40' : 'border border-amber-500/30'}`}>
                                <span className="text-xl mt-0.5">{isOpenSession ? '🪑' : '🔔'}</span>
                                <div>
                                    <p className={`font-bold text-sm ${isOpenSession ? 'text-violet-400' : 'text-amber-400'}`}>{label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Table {tableLabel}{req.message ? ` — ${req.message}` : ''}</p>
                                </div>
                            </div>
                        ), { duration: 7000, position: 'top-right' })
                    }
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    setRequests((prev) =>
                        prev
                            .map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r))
                            .filter((r) => r.status !== 'completed' && r.status !== 'cancelled')
                    )
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    const handleAcknowledge = async (id: string) => {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'acknowledged' as const } : r)))
        await acknowledgeServiceRequest(id, userId)
    }

    const handleComplete = async (id: string) => {
        setRequests((prev) => prev.filter((r) => r.id !== id))
        await completeServiceRequest(id)
    }

    const handleOpenSession = async (req: ServiceRequestWithTable) => {
        if (!req.table_id) return
        setOpeningSession(req.id)
        const res = await openSessionFromRequest(req.id, req.table_id, restaurantId)
        setOpeningSession(null)
        if (res.error) {
            toast.error(res.error)
        } else {
            setRequests((prev) => prev.filter((r) => r.id !== req.id))
            toast.success(`Session opened for Table ${getTableLabel(req)}`)
        }
    }

    const pending = requests.filter((r) => r.status === 'pending')
    const acknowledged = requests.filter((r) => r.status === 'acknowledged')

    if (pending.length === 0 && acknowledged.length === 0) return null

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <Bell size={15} className="text-amber-500" />
                <h2 className="font-semibold text-gray-900 text-sm">Service Requests</h2>
                {pending.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">
                        {pending.length} urgent
                    </span>
                )}
            </div>

            <div className="divide-y divide-gray-50">
                {/* Pending — urgent */}
                {pending.map((req) => {
                    const Icon = ICON_MAP[req.request_type as ServiceRequestType]
                    const isOpenSession = req.request_type === 'open_session'
                    return (
                        <div key={req.id} className={`px-4 py-3 flex items-center gap-3 ${isOpenSession ? 'bg-violet-50/60' : 'bg-amber-50/50'}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${COLOR_MAP[req.request_type as ServiceRequestType]}`}>
                                <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-900">
                                        Table {getTableLabel(req)}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{timeAgo(req.created_at)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {LABEL_MAP[req.request_type as ServiceRequestType]}
                                    {req.message && <span className="text-gray-400"> — {req.message}</span>}
                                </p>
                            </div>
                            {isOpenSession ? (
                                <button
                                    onClick={() => handleOpenSession(req)}
                                    disabled={openingSession === req.id}
                                    className="bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition disabled:opacity-60"
                                >
                                    {openingSession === req.id ? '…' : 'Open'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleAcknowledge(req.id)}
                                    className="bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition"
                                >
                                    On it
                                </button>
                            )}
                        </div>
                    )
                })}

                {/* Acknowledged — in progress */}
                {acknowledged.map((req) => {
                    const Icon = ICON_MAP[req.request_type as ServiceRequestType]
                    const isOpenSession = req.request_type === 'open_session'
                    return (
                        <div key={req.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${COLOR_MAP[req.request_type as ServiceRequestType]}`}>
                                <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm text-gray-700">
                                    Table {getTableLabel(req)}
                                </span>
                                <p className="text-xs text-gray-400">{LABEL_MAP[req.request_type as ServiceRequestType]}</p>
                            </div>
                            {isOpenSession ? (
                                <button
                                    onClick={() => handleOpenSession(req)}
                                    disabled={openingSession === req.id}
                                    className="bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition disabled:opacity-60"
                                >
                                    {openingSession === req.id ? '…' : 'Open'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleComplete(req.id)}
                                    className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
