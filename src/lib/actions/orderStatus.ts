'use server'

import { createAdminClient } from '@/lib/supabase/server'

export interface TrackedStatus {
    id: string
    status: string
}

/**
 * Lightweight status lookup for the customer's active-order pill. Both dine-in
 * and takeout live in the unified `orders` table, so one query covers both.
 * Terminal statuses ('delivered','cancelled') tell the client to stop tracking.
 */
export async function getTrackedOrderStatuses(ids: string[]): Promise<TrackedStatus[]> {
    const clean = (ids || []).filter(Boolean).slice(0, 5)
    if (clean.length === 0) return []
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('orders')
        .select('id, status')
        .in('id', clean)
    return (data || []) as TrackedStatus[]
}
