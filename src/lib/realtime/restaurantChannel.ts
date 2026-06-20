'use client'

/**
 * Shared, ref-counted Realtime channel manager (one channel per restaurant).
 *
 * Previously every live component opened its own `supabase.channel(...)` — e.g. the
 * kitchen screen alone ran THREE: OrderQueue + KitchenStats both subscribed to the
 * same `orders` rows, and TakeoutQueue to `takeout_orders`. Each binding is a
 * separate server-side `postgres_changes` filter, so order events were evaluated and
 * delivered twice per kitchen tab.
 *
 * This manager keeps a single channel per restaurant with one catch-all binding per
 * table, and fans each payload out to the registered component callbacks. Components
 * subscribe via `useRestaurantTable`; the channel is created on first subscriber and
 * torn down when the last one unmounts.
 */

import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChangePayload = RealtimePostgresChangesPayload<{ [key: string]: any }>
export type RealtimeCallback = (payload: ChangePayload) => void

interface RestaurantEntry {
    channel: RealtimeChannel | null
    tables: Map<string, Set<RealtimeCallback>>
    refCount: number
}

const registry = new Map<string, RestaurantEntry>()
const supabase = createClient()

/** Build (or rebuild) the channel with a catch-all binding for every active table. */
function buildChannel(restaurantId: string, entry: RestaurantEntry): RealtimeChannel {
    let channel = supabase.channel(`restaurant-rt-${restaurantId}`)

    for (const [table, callbacks] of entry.tables) {
        channel = channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table, filter: `restaurant_id=eq.${restaurantId}` },
            (payload) => {
                // Snapshot to tolerate (un)subscribe during dispatch.
                for (const cb of Array.from(callbacks)) {
                    try { cb(payload) } catch { /* one bad listener must not break the rest */ }
                }
            }
        )
    }

    channel.subscribe()
    return channel
}

/**
 * Register a callback for INSERT/UPDATE/DELETE on `table`, scoped to the restaurant.
 * Returns an unsubscribe function. Bindings are keyed by table; the standard
 * `restaurant_id=eq.<id>` filter is applied automatically.
 */
export function subscribeRestaurantTable(
    restaurantId: string,
    table: string,
    callback: RealtimeCallback,
): () => void {
    let entry = registry.get(restaurantId)
    if (!entry) {
        entry = { channel: null, tables: new Map(), refCount: 0 }
        registry.set(restaurantId, entry)
    }

    const isNewTable = !entry.tables.has(table)
    if (isNewTable) entry.tables.set(table, new Set())
    entry.tables.get(table)!.add(callback)
    entry.refCount++

    // postgres_changes bindings are fixed at subscribe time, so a newly-seen table
    // (or the very first subscriber) requires a channel rebuild. After a page's
    // component tree mounts, the table set is stable and no further rebuilds occur.
    if (isNewTable || !entry.channel) {
        if (entry.channel) supabase.removeChannel(entry.channel)
        entry.channel = buildChannel(restaurantId, entry)
    }

    return () => {
        const e = registry.get(restaurantId)
        if (!e) return
        const set = e.tables.get(table)
        if (set) {
            set.delete(callback)
            if (set.size === 0) e.tables.delete(table)
        }
        e.refCount = Math.max(0, e.refCount - 1)
        if (e.refCount === 0) {
            if (e.channel) supabase.removeChannel(e.channel)
            registry.delete(restaurantId)
        }
    }
}
