'use server'

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function openSession(tableId: string, restaurantId: string, guestCount?: number) {
    const supabase = await createServerClient()
    const adminSupabase = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[openSession] No authenticated user found')
        return { error: 'Unauthorized' }
    }

    // Expire any stale sessions for this table that passed their expires_at but
    // were never cleaned up — otherwise the unique-active-per-table index blocks the insert.
    await adminSupabase
        .from('sessions')
        .update({ status: 'expired', closed_at: new Date().toISOString() })
        .eq('table_id', tableId)
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())

    // Generate a URL-safe session token (avoids DB-level base64url encoding issues)
    const { randomBytes } = await import('crypto')
    const sessionToken = randomBytes(32).toString('base64url')

    const { data, error } = await adminSupabase
        .from('sessions')
        .insert({
            table_id: tableId,
            restaurant_id: restaurantId,
            opened_by: user.id,
            guest_count: guestCount || null,
            session_token: sessionToken,
        })
        .select('*')
        .single()

    if (error) {
        console.error('[openSession] Insert failed:', error)
        if (error.code === '23505') return { error: 'Table already has an active session' }
        return { error: error.message }
    }

    void logAudit({
        restaurantId,
        userId: user.id,
        action: 'session_opened',
        entityType: 'session',
        entityId: data?.id,
        newValue: { table_id: tableId, guest_count: guestCount ?? null },
    })

    revalidatePath('/waiter')
    return { success: true, session: data }
}

export async function closeSession(sessionId: string) {
    const supabase = await createServerClient()
    const adminSupabase = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: session, error } = await adminSupabase
        .from('sessions')
        .update({
            status: 'closed',
            closed_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('status', 'active')
        .select('restaurant_id')
        .single()

    if (error) return { error: error.message }

    void logAudit({
        restaurantId: session.restaurant_id,
        userId: user?.id ?? null,
        action: 'session_closed',
        entityType: 'session',
        entityId: sessionId,
        newValue: { reason: 'manual' },
    })

    revalidatePath('/waiter')
    return { success: true }
}

/**
 * Opens a session for a table AND completes the open_session service request in one action.
 */
export async function openSessionFromRequest(
    requestId: string,
    tableId: string,
    restaurantId: string
): Promise<{ error?: string; success?: boolean }> {
    const result = await openSession(tableId, restaurantId)
    if (result.error) return { error: result.error }

    const adminSupabase = await createAdminClient()
    await adminSupabase
        .from('service_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', requestId)

    return { success: true }
}

/**
 * Waiter marks a table as dirty (needs cleaning) or reserved.
 * Clears back to 'available' once actioned.
 */
export async function setTableStatus(
    tableId: string,
    status: 'available' | 'dirty' | 'reserved'
): Promise<{ error?: string; success?: boolean }> {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tables')
        .update({ table_status: status })
        .eq('id', tableId)

    if (error) return { error: error.message }
    revalidatePath('/waiter')
    return { success: true }
}
