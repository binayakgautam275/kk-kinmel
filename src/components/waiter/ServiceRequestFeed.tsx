'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { acknowledgeServiceRequest, completeServiceRequest } from '@/app/api/service-requests/actions'
import { Bell, Droplets, Receipt, Sparkles, MessageCircle, Check, Clock } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { playKitchenPing } from '@/lib/audio'
import type { ServiceRequest, ServiceRequestType } from '@/types/database'

const ICON_MAP: Record<ServiceRequestType, typeof Bell> = {
    call_waiter: Bell,
    request_bill: Receipt,
    need_water: Droplets,
    clean_table: Sparkles,
    other: MessageCircle,
}

const LABEL_MAP: Record<ServiceRequestType, string> = {
    call_waiter: 'Call Waiter',
    request_bill: 'Request Bill',
    need_water: 'Need Water',
    clean_table: 'Clean Table',
    other: 'Other',
}

const COLOR_MAP: Record<ServiceRequestType, string> = {
    call_waiter: 'text-blue-400 bg-blue-500/10',
    request_bill: 'text-green-400 bg-green-500/10',
    need_water: 'text-cyan-400 bg-cyan-500/10',
    clean_table: 'text-amber-400 bg-amber-500/10',
    other: 'text-purple-400 bg-purple-500/10',
}

type ServiceRequestWithTable = ServiceRequest & {
    sessions?: { tables?: { label?: string } }
}

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
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase
            .channel(`service-requests-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'service_requests',
                    filter: `restaurant_id=eq.${restaurantId}`,
                },
                async (payload) => {
                    // Fetch full details with table join
                    const { data } = await supabase
                        .from('service_requests')
                        .select('*, sessions ( tables ( label ) )')
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        setRequests((prev) => [data as unknown as ServiceRequestWithTable, ...prev])
                        playKitchenPing()
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'service_requests',
                    filter: `restaurant_id=eq.${restaurantId}`,
                },
                (payload) => {
                    setRequests((prev) =>
                        prev
                            .map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r))
                            .filter((r) => r.status !== 'completed' && r.status !== 'cancelled')
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [restaurantId, supabase])

    const handleAcknowledge = async (id: string) => {
        // Optimistic update
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: 'acknowledged' as const } : r))
        )
        await acknowledgeServiceRequest(id, userId)
    }

    const handleComplete = async (id: string) => {
        // Optimistic update
        setRequests((prev) => prev.filter((r) => r.id !== id))
        await completeServiceRequest(id)
    }

    const pending = requests.filter((r) => r.status === 'pending')
    const acknowledged = requests.filter((r) => r.status === 'acknowledged')

    return (
        <div className="space-y-4">
            {/* Pending requests - urgent */}
            {pending.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                        <Clock size={14} /> Pending ({pending.length})
                    </h3>
                    <div className="space-y-2">
                        {pending.map((req) => {
                            const Icon = ICON_MAP[req.request_type as ServiceRequestType]
                            return (
                                <div key={req.id} className="bg-gray-800 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${COLOR_MAP[req.request_type as ServiceRequestType]}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-white">
                                                Table {req.sessions?.tables?.label || '?'}
                                            </span>
                                            <span className="text-xs text-gray-400">{timeAgo(req.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-gray-300">
                                            {LABEL_MAP[req.request_type as ServiceRequestType]}
                                            {req.message && ` — ${req.message}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleAcknowledge(req.id)}
                                        className="bg-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
                                    >
                                        On it
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Acknowledged requests */}
            {acknowledged.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                        <Check size={14} /> In Progress ({acknowledged.length})
                    </h3>
                    <div className="space-y-2">
                        {acknowledged.map((req) => {
                            const Icon = ICON_MAP[req.request_type as ServiceRequestType]
                            return (
                                <div key={req.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-3 opacity-70">
                                    <div className={`p-2 rounded-lg ${COLOR_MAP[req.request_type as ServiceRequestType]}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-sm text-white">
                                            Table {req.sessions?.tables?.label || '?'}
                                        </span>
                                        <p className="text-xs text-gray-400">{LABEL_MAP[req.request_type as ServiceRequestType]}</p>
                                    </div>
                                    <button
                                        onClick={() => handleComplete(req.id)}
                                        className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
                                    >
                                        Done
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {pending.length === 0 && acknowledged.length === 0 && (
                <p className="text-gray-500 text-center py-8 text-sm">No service requests</p>
            )}
        </div>
    )
}
