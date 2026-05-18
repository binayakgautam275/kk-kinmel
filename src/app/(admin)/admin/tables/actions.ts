'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTableAction(restaurantId: string, label: string, capacity?: number) {
    const supabase = await createAdminClient()

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
    return { success: true }
}
