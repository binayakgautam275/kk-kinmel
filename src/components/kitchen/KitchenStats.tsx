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
        const channel = supabase
            .channel(`kitchen-stats-${restaurantId}`)
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
                        setQueued(n => Math.max(0, n - 1)); setPreparing(n => n + 1)
                    } else if (prev === 'preparing' && next === 'ready') {
                        setPreparing(n => Math.max(0, n - 1)); setReady(n => n + 1)
                    } else if ((prev === 'pending' || prev === 'confirmed') && next === 'ready') {
                        setQueued(n => Math.max(0, n - 1)); setReady(n => n + 1)
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
        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    const stats = [
        { icon: Zap,         label: 'In Queue',   value: queued,    color: '#f59e0b', active: queued > 0 },
        { icon: Clock,       label: 'Preparing',  value: preparing, color: '#f97316', active: preparing > 0 },
        { icon: CheckCircle2,label: 'Ready',      value: ready,     color: '#10b981', active: ready > 0, pulse: ready > 0 },
        { icon: Package,     label: 'Done Today', value: completed, color: '#60a5fa', active: true },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {stats.map((s) => {
                const Icon = s.icon
                return (
                    <div key={s.label}
                         className="rounded-xl border border-white/[0.08] p-3 md:p-4 flex items-center gap-3"
                         style={{ background: s.active && s.color ? `${s.color}14` : 'rgba(255,255,255,0.03)' }}>
                        <div className={`shrink-0 ${s.pulse ? 'animate-pulse' : ''}`}>
                            <Icon size={20} style={{ color: s.active ? s.color : '#4b5563' }} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: s.active ? s.color : '#6b7280' }}>
                                {s.value}
                            </p>
                            <p className="text-[10px] md:text-xs text-white/30 font-medium mt-0.5">{s.label}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
