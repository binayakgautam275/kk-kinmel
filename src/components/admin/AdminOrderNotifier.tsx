'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playNewOrder } from '@/lib/audio'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

export default function AdminOrderNotifier({ restaurantId }: { restaurantId: string }) {
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`admin-order-notifier-${restaurantId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    playNewOrder().catch(() => {})
                    const { data } = await supabase
                        .from('orders')
                        .select('total_amount, sessions ( tables ( label ) )')
                        .eq('id', payload.new.id)
                        .single()
                    const tableLabel = (data?.sessions as unknown as { tables?: { label?: string } } | null)?.tables?.label
                    const amount = data?.total_amount ?? payload.new.total_amount
                    toast.custom((t) => (
                        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-2xl rounded-xl px-4 py-3 flex items-start gap-3 border border-orange-200`}>
                            <span className="text-xl mt-0.5">🛎️</span>
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-orange-700">New Order!</p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    {tableLabel ? `Table ${tableLabel}` : 'Takeout'} · {formatCurrency(amount)}
                                </p>
                            </div>
                        </div>
                    ), { duration: 6000, position: 'top-right' })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [restaurantId])

    return null
}
