'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateThemeAction(
    settingsId: string,
    theme: Record<string, string>
): Promise<{ error?: string }> {
    const { restaurantId } = await getCurrentUser()
    const supabase = await createAdminClient()

    // Verify the settings row belongs to this restaurant
    const { data: row } = await supabase
        .from('settings')
        .select('restaurant_id')
        .eq('id', settingsId)
        .single()

    if (row?.restaurant_id !== restaurantId) {
        return { error: 'Unauthorized' }
    }

    const { error } = await supabase
        .from('settings')
        .update({ theme, updated_at: new Date().toISOString() })
        .eq('id', settingsId)

    if (error) return { error: error.message }

    // Force the root layout to refetch the updated theme
    revalidatePath('/', 'layout')

    return {}
}
