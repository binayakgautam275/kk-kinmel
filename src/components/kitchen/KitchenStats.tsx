'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, Clock, CheckCircle2, Package } from 'lucide-react'

interface Props {
    queuedOrders: number
    preparingOrders: number
    readyOrders: number
    completedToday: number
    restaurantId: string
}

export default function KitchenStats({
    queuedOrders: initQueued,
    preparingOrders: initPreparing,
    readyOrders: initReady,
    completedToday: initCompleted,
    restaurantId,
}: Props) {
    const [queued, setQueued] = useState(initQueued)
    const [preparing, setPreparing] = useState(initPreparing)
    const [ready, setReady] = useState(initReady)
    const [completed, setCompleted] = useState(initCompleted)
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        const supabase = supabaseRef.current
        // Listen to orders — update queue/preparing/ready counts
        const orderChannel = supabase
            .channel(`kitchen-stats-orders-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const s = payload.new.status as string
                    if (s === 'pending' || s === 'confirmed') setQueued(n => n + 1)
                    else if (s === 'preparing') setPreparing(n => n + 1)
                    else if (s === 'ready') setReady(n => n + 1)
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const prev = payload.old.status as string
                    const next = payload.new.status as string

                    if ((prev === 'pending' || prev === 'confirmed') && next === 'preparing') {
                        setQueued(n => Math.max(0, n - 1))
                        setPreparing(n => n + 1)
                    } else if (prev === 'preparing' && next === 'ready') {
                        setPreparing(n => Math.max(0, n - 1))
                        setReady(n => n + 1)
                    } else if ((prev === 'pending' || prev === 'confirmed') && next === 'ready') {
                        setQueued(n => Math.max(0, n - 1))
                        setReady(n => n + 1)
                    } else if (next === 'delivered') {
                        setCompleted(n => n + 1)
                        if (prev === 'preparing') setPreparing(n => Math.max(0, n - 1))
                        else if (prev === 'ready') setReady(n => Math.max(0, n - 1))
                    } else if (next === 'cancelled') {
                        if (prev === 'pending' || prev === 'confirmed') setQueued(n => Math.max(0, n - 1))
                        else if (prev === 'preparing') setPreparing(n => Math.max(0, n - 1))
                        else if (prev === 'ready') setReady(n => Math.max(0, n - 1))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(orderChannel)
        }
    }, [restaurantId])

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <StatCard
                icon={Zap}
                label="In Queue"
                value={String(queued)}
                accent={queued > 0 ? 'yellow' : 'gray'}
                pulse={queued > 0}
            />
            <StatCard
                icon={Clock}
                label="Preparing"
                value={String(preparing)}
                accent={preparing > 0 ? 'orange' : 'gray'}
                pulse={preparing > 0}
            />
            <StatCard
                icon={CheckCircle2}
                label="Ready"
                value={String(ready)}
                accent={ready > 0 ? 'green' : 'gray'}
                pulse={ready > 0}
            />
            <StatCard
                icon={Package}
                label="Completed"
                value={String(completed)}
                accent="blue"
            />
        </div>
    )
}

const ACCENT: Record<string, { bg: string; icon: string; text: string; border: string }> = {
    yellow: { bg: 'bg-yellow-900/20', icon: 'text-yellow-400', text: 'text-yellow-100', border: 'border-yellow-800' },
    orange: { bg: 'bg-orange-900/20', icon: 'text-orange-400', text: 'text-orange-100', border: 'border-orange-800' },
    green:  { bg: 'bg-emerald-900/20', icon: 'text-emerald-400', text: 'text-emerald-100', border: 'border-emerald-800' },
    blue:   { bg: 'bg-blue-900/20', icon: 'text-blue-400', text: 'text-blue-100', border: 'border-blue-800' },
    gray:   { bg: 'bg-gray-900/30', icon: 'text-gray-500', text: 'text-gray-100', border: 'border-gray-800' },
}

function StatCard({ icon: Icon, label, value, accent, pulse }: {
    icon: React.ElementType
    label: string
    value: string
    accent: string
    pulse?: boolean
}) {
    const c = ACCENT[accent] || ACCENT.gray
    return (
        <div className={`rounded-xl border ${c.border} ${c.bg} p-3 md:p-4 flex items-center gap-3 shadow-sm backdrop-blur-sm`}>
            <div className={`shrink-0 ${pulse ? 'animate-pulse' : ''}`}>
                <Icon size={20} className={c.icon} />
            </div>
            <div className="min-w-0">
                <p className={`text-lg md:text-2xl font-bold tabular-nums ${c.text}`}>{value}</p>
                <p className="text-[10px] md:text-xs text-gray-400 font-medium truncate">{label}</p>
            </div>
        </div>
    )
}
