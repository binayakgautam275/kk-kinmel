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
        // Listen to sessions — update occupied table count
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

        // Listen to orders — update ready/kitchen counts
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
                    // Transitions that affect ready count
                    if (prev !== 'ready' && next === 'ready') {
                        setReady(n => n + 1)
                        setKitchen(n => Math.max(0, n - 1))
                    } else if (prev === 'ready' && next !== 'ready') {
                        setReady(n => Math.max(0, n - 1))
                    }
                    // Delivered/cancelled removes from kitchen if it was there
                    if (['delivered', 'cancelled'].includes(next) && ['pending', 'confirmed', 'preparing'].includes(prev)) {
                        setKitchen(n => Math.max(0, n - 1))
                    }
                }
            )
            .subscribe()

        // Listen to service requests
        const srChannel = supabase
            .channel(`floor-stats-sr-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurantId}` },
                () => setPending(n => n + 1)
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const prev = payload.old.status as string
                    const next = payload.new.status as string
                    if (prev === 'pending' && next !== 'pending') setPending(n => Math.max(0, n - 1))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(sessionChannel)
            supabase.removeChannel(orderChannel)
            supabase.removeChannel(srChannel)
        }
    }, [restaurantId])

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <StatCard
                icon={Users}
                label="Tables Occupied"
                value={`${occupied} / ${totalTables}`}
                accent={occupied > 0 ? 'blue' : 'gray'}
            />
            <StatCard
                icon={Package}
                label="Ready to Deliver"
                value={String(ready)}
                accent={ready > 0 ? 'green' : 'gray'}
                pulse={ready > 0}
            />
            <StatCard
                icon={ChefHat}
                label="In Kitchen"
                value={String(kitchen)}
                accent={kitchen > 0 ? 'orange' : 'gray'}
            />
            <StatCard
                icon={Bell}
                label="Service Requests"
                value={String(pending)}
                accent={pending > 0 ? 'red' : 'gray'}
                pulse={pending > 0}
            />
        </div>
    )
}

const ACCENT: Record<string, { bg: string; icon: string; text: string; border: string }> = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   text: 'text-blue-700',   border: 'border-blue-200' },
    green:  { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' },
    orange: { bg: 'bg-orange-50',  icon: 'text-orange-500',  text: 'text-orange-700',  border: 'border-orange-200' },
    red:    { bg: 'bg-red-50',     icon: 'text-red-500',     text: 'text-red-700',     border: 'border-red-200' },
    gray:   { bg: 'bg-white',      icon: 'text-gray-400',    text: 'text-gray-900',    border: 'border-gray-200' },
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
        <div className={`rounded-xl border ${c.border} ${c.bg} p-3 md:p-4 flex items-center gap-3 shadow-sm`}>
            <div className={`shrink-0 ${pulse ? 'animate-pulse' : ''}`}>
                <Icon size={20} className={c.icon} />
            </div>
            <div className="min-w-0">
                <p className={`text-lg md:text-2xl font-bold tabular-nums ${c.text}`}>{value}</p>
                <p className="text-[10px] md:text-xs text-gray-500 font-medium truncate">{label}</p>
            </div>
        </div>
    )
}
