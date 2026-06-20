'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTableAction(restaurantId: string, label: string, capacity?: number) {
    const supabase = await createAdminClient()

    // Enforce plan table limit
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('max_tables')
        .eq('id', restaurantId)
        .single()

    const maxTables = (restaurant as { max_tables?: number } | null)?.max_tables ?? 999

    const { count: activeTableCount } = await supabase
        .from('tables')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)

    if ((activeTableCount ?? 0) >= maxTables) {
        return { error: `Table limit reached. Your plan allows ${maxTables} active tables.` }
    }

    // Generate a secure random token for the QR code
    const qrToken = crypto.randomUUID().split('-')[0] + '-' + Date.now().toString(36).slice(-4)

    const { data, error } = await supabase
        .from('tables')
        .insert({
            restaurant_id: restaurantId,
            label,
            capacity: capacity || null,
            qr_token: qrToken,
            is_active: true
        })
        .select()
        .single()

    if (error) return { error: error.message }

    revalidatePath('/admin/tables')
    // Keep the public ISR landing page (/r/[slug]) in sync after a table change.
    revalidatePath('/r/[restaurantSlug]', 'page')
    return { data }
}

export async function updateTableAction(id: string, updates: Record<string, unknown>) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tables')
        .update(updates)
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/admin/tables')
    revalidatePath('/r/[restaurantSlug]', 'page')
    return { success: true }
}

export async function deleteTableAction(id: string) {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('tables')
        .update({ is_active: false })
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/admin/tables')
    revalidatePath('/r/[restaurantSlug]', 'page')
    return { success: true }
}
