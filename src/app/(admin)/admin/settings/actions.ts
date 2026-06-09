'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateRestaurantSettingsAction(restaurantId: string, updates: Record<string, unknown>) {
    const supabase = await createAdminClient()

    // Validate that we only update allowed fields
    const safeUpdates: Record<string, unknown> = {
        name: updates.name,
        contact_phone: updates.contact_phone,
        contact_email: updates.contact_email,
        address: updates.address,
        logo_url: updates.logo_url,
        tax_rate: updates.tax_rate,
        currency: updates.currency,
        currency_symbol: updates.currency_symbol,
        pan_number: updates.pan_number,
        vat_registered: updates.vat_registered,
        payment_qr_url: updates.payment_qr_url,
        payment_qr_label: updates.payment_qr_label,
    }

    // Strip undefined values
    const cleanUpdates = Object.fromEntries(
        Object.entries(safeUpdates).filter(([, v]) => v !== undefined)
    )

    const { error } = await supabase
        .from('restaurants')
        .update(cleanUpdates)
        .eq('id', restaurantId)

    if (error) return { error: error.message }

    // Revalidate multiple paths since restaurant settings (like name/logo) 
    // likely affect the whole app layout and public menu pages
    revalidatePath('/', 'layout')

    return { success: true }
}
