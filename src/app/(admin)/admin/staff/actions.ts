'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateStaffRoleAction(userId: string, targetRoleId: number) {
    const currentUser = await getCurrentUser()
    const supabase = await createAdminClient()

    // Verify target user belongs to the same restaurant
    const { data: targetUser } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', userId)
        .single()

    if (targetUser?.restaurant_id !== currentUser.restaurantId) {
        return { error: 'Unauthorized' }
    }

    // Managers cannot elevate anyone to super_admin (role_id: 1)
    if (currentUser.role === 'manager' && targetRoleId === 1) {
        return { error: 'Managers cannot assign super admin role' }
    }

    const { error } = await supabase
        .from('users')
        .update({ role_id: targetRoleId })
        .eq('id', userId)

    if (error) return { error: error.message }

    revalidatePath('/admin/staff')
    return { success: true }
}

export async function toggleStaffStatusAction(userId: string, isActive: boolean) {
    const currentUser = await getCurrentUser()
    const supabase = await createAdminClient()

    // Verify target user belongs to the same restaurant
    const { data: targetUser } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', userId)
        .single()

    if (targetUser?.restaurant_id !== currentUser.restaurantId) {
        return { error: 'Unauthorized' }
    }

    const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId)

    if (error) return { error: error.message }

    revalidatePath('/admin/staff')
    return { success: true }
}
