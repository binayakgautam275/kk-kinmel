'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Package, Bell, ChefHat } from 'lucide-react'

interface Props {
    occupiedTables: number
    totalTables: number
    readyOrders: number
    kitchenOrders: number
    pendingRequests: number
    restaurantId: string
}

export default function FloorStats({
    occupiedTables: initOccupied,
    totalTables,
    readyOrders: initReady,
    kitchenOrders: initKitchen,
    pendingRequests: initPending,
    restaurantId,
}: Props) {
    const [occupied, setOccupied] = useState(initOccupied)
    const [ready, setReady] = useState(initReady)
    const [kitchen, setKitchen] = useState(initKitchen)
    const [pending, setPending] = useState(initPending)
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        const supabase = supabaseRef.current
        const sessionChannel = supabase
            .channel(`floor-stats-sessions-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions', filter: `restaurant_id=eq.${restaurantId}` },
                () => setOccupied(n => n + 1)
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    if (payload.new.status === 'closed' || payload.new.status === 'expired') {
                        setOccupied(n => Math.max(0, n - 1))
                    }
                }
            )
            .subscribe()

        const orderChannel = supabase
            .channel(`floor-stats-orders-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const s = payload.new.status as string
                    if (s === 'ready') setReady(n => n + 1)
                    else if (['pending', 'confirmed', 'preparing'].includes(s)) setKitchen(n => n + 1)
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const prev = payload.old.status as string
                    const next = payload.new.status as string
                    if (prev !== 'ready' && next === 'ready') {
                        setReady(n => n + 1)
                        setKitchen(n => Math.max(0, n - 1))
                    } else if (prev === 'ready' && next !== 'ready') {
                        setReady(n => Math.max(0, n - 1))
                    }
                    if (['delivered', 'cancelled'].includes(next) && ['pending', 'confirmed', 'preparing'].includes(prev)) {
                        setKitchen(n => Math.max(0, n - 1))
                    }
                }
            )
            .subscribe()

        const srChannel = supabase
            .channel(`floor-stats-sr-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurantId}` },
                () => setPending(n => n + 1)
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    if (payload.old.status === 'pending' && payload.new.status !== 'pending') setPending(n => Math.max(0, n - 1))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(sessionChannel)
            supabase.removeChannel(orderChannel)
            supabase.removeChannel(srChannel)
        }
    }, [restaurantId])

    const stats = [
        {
            icon: Users,
            label: 'Tables',
            value: `${occupied}`,
            sub: `of ${totalTables}`,
            active: occupied > 0,
            urgency: 'blue' as const,
        },
        {
            icon: Package,
            label: 'Ready',
            value: String(ready),
            sub: 'to deliver',
            active: ready > 0,
            urgency: 'green' as const,
            pulse: ready > 0,
        },
        {
            icon: ChefHat,
            label: 'Kitchen',
            value: String(kitchen),
            sub: 'in prep',
            active: kitchen > 0,
            urgency: 'orange' as const,
        },
        {
            icon: Bell,
            label: 'Requests',
            value: String(pending),
            sub: 'pending',
            active: pending > 0,
            urgency: 'red' as const,
            pulse: pending > 0,
        },
    ]

    const COLORS = {
        blue:   { card: 'border-blue-100 bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   num: 'text-blue-700' },
        green:  { card: 'border-emerald-100 bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', num: 'text-emerald-700' },
        orange: { card: 'border-orange-100 bg-orange-50',  icon: 'bg-orange-100 text-orange-600',  num: 'text-orange-700' },
        red:    { card: 'border-red-100 bg-red-50',     icon: 'bg-red-100 text-red-600',     num: 'text-red-700' },
        none:   { card: 'border-gray-100 bg-white',     icon: 'bg-gray-100 text-gray-400',   num: 'text-gray-800' },
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => {
                const c = s.active ? COLORS[s.urgency] : COLORS.none
                const Icon = s.icon
                return (
                    <div key={s.label} className={`rounded-xl border ${c.card} p-4 flex items-center gap-3`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon} ${s.pulse ? 'animate-pulse' : ''}`}>
                            <Icon size={18} />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1">
                                <p className={`text-2xl font-bold tabular-nums leading-none ${c.num}`}>{s.value}</p>
                                {s.sub && <p className="text-[11px] text-gray-400 font-medium">{s.sub}</p>}
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
