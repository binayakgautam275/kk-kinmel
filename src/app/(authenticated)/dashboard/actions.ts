'use server'

import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendStaffInviteEmail } from '@/lib/email'

// ---------------------------------------------------------------------------
// Restaurant settings
// ---------------------------------------------------------------------------

export async function updateRestaurantSettings(
    _prevState: { error?: string; success?: boolean },
    formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const name = (formData.get('name') as string | null)?.trim()
    const address = (formData.get('address') as string | null)?.trim() || null
    const contact_phone = (formData.get('contact_phone') as string | null)?.trim() || null
    const contact_email = (formData.get('contact_email') as string | null)?.trim() || null
    const pan_number = (formData.get('pan_number') as string | null)?.trim() || null
    const vat_registered = formData.get('vat_registered') === 'on'
    const payment_qr_label = (formData.get('payment_qr_label') as string | null)?.trim() || null

    if (!name) return { error: 'Restaurant name is required.' }

    // Handle physical menu uploads
    const physicalMenuFiles = formData.getAll('physical_menus') as File[]
    const validFiles = physicalMenuFiles.filter(f => f.size > 0 && f.name !== 'undefined')
    let physical_menu_urls: string[] | undefined = undefined

    if (validFiles.length > 0) {
        physical_menu_urls = []
        for (const file of validFiles) {
            const ext = file.name.split('.').pop()
            const fileName = `${restaurantId}/physical-menus/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
            
            const { error: uploadError } = await adminSupabase.storage
                .from('public_assets')
                .upload(fileName, file, { upsert: true })

            if (!uploadError) {
                const { data: publicUrlData } = adminSupabase.storage
                    .from('public_assets')
                    .getPublicUrl(fileName)
                if (publicUrlData?.publicUrl) {
                    physical_menu_urls.push(publicUrlData.publicUrl)
                }
            }
        }
    }

    // Prepare update payload
    const updatePayload: Record<string, any> = { 
        name, address, contact_phone, contact_email, pan_number, vat_registered, payment_qr_label 
    }
    
    // If we successfully uploaded new ones, optionally we append them. 
    // Here we'll append to existing or replace depending on what we want. 
    // For simplicity, let's just append to existing if they uploaded new ones.
    if (physical_menu_urls && physical_menu_urls.length > 0) {
        const { data: currentData } = await adminSupabase.from('restaurants').select('physical_menu_urls').eq('id', restaurantId).single()
        const existingUrls = currentData?.physical_menu_urls || []
        updatePayload.physical_menu_urls = [...existingUrls, ...physical_menu_urls]
    }

    const { error } = await adminSupabase
        .from('restaurants')
        .update(updatePayload)
        .eq('id', restaurantId)

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings')
    return { success: true }
}

// ---------------------------------------------------------------------------
// Staff invite
// ---------------------------------------------------------------------------

const ROLE_IDS: Record<string, number> = {
    manager: 2,
    kitchen: 3,
    waiter: 4,
    cashier: 6,
}

function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function inviteStaffMember(
    _prevState: { error?: string; tempPassword?: string },
    formData: FormData,
): Promise<{ error?: string; tempPassword?: string }> {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const full_name = (formData.get('full_name') as string | null)?.trim()
    const email = (formData.get('email') as string | null)?.trim().toLowerCase()
    const roleStr = (formData.get('role') as string | null) || 'waiter'

    if (!full_name) return { error: 'Full name is required.' }
    if (!email || !email.includes('@')) return { error: 'Valid email is required.' }

    const role_id = ROLE_IDS[roleStr]
    if (!role_id) return { error: 'Invalid role.' }

    // Check staff limit
    const { data: restaurant } = await adminSupabase
        .from('restaurants')
        .select('subscription_tier, max_staff')
        .eq('id', restaurantId)
        .single()

    const { count: staffCount } = await adminSupabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .neq('role_id', 5)

    const maxStaff = restaurant?.max_staff || 3
    if ((staffCount || 0) >= maxStaff) {
        return { error: `Staff limit reached. Your ${restaurant?.subscription_tier || 'free'} plan allows ${maxStaff} staff members.` }
    }

    const tempPassword = generateTempPassword()

    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name },
    })

    if (authError || !authUser?.user) {
        const isEmailTaken = authError?.message?.toLowerCase().includes('already registered') ||
            authError?.message?.toLowerCase().includes('already been registered')
        return { error: isEmailTaken ? 'That email is already registered.' : (authError?.message || 'Failed to create account.') }
    }

    // Wait for auth trigger, then update user row
    await new Promise(r => setTimeout(r, 500))

    const { error: updateError } = await adminSupabase
        .from('users')
        .update({ restaurant_id: restaurantId, full_name, email, role_id, is_active: true })
        .eq('id', authUser.user.id)

    if (updateError) {
        await adminSupabase.auth.admin.deleteUser(authUser.user.id)
        return { error: updateError.message }
    }

    // Email the invite — best-effort, never fail the action
    const { data: restaurantRow } = await adminSupabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single()
    const restaurantName = (restaurantRow as { name?: string } | null)?.name ?? 'the restaurant'
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.kkkhane.com'}/login`
    void sendStaffInviteEmail(email, full_name, restaurantName, tempPassword, loginUrl)

    revalidatePath('/dashboard/team')
    return { tempPassword }
}

// ---------------------------------------------------------------------------
// Remove staff
// ---------------------------------------------------------------------------

export async function removeStaffMember(
    userId: string,
): Promise<{ error?: string }> {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    // Verify the target user belongs to this restaurant
    const { data: target } = await adminSupabase
        .from('users')
        .select('id, restaurant_id, role_id')
        .eq('id', userId)
        .single()

    if (!target || target.restaurant_id !== restaurantId) {
        return { error: 'User not found.' }
    }

    // Don't allow removing super_admin (role_id 1) via this flow
    if (target.role_id === 1) return { error: 'Cannot remove super admin.' }

    await adminSupabase.from('users').update({ is_active: false }).eq('id', userId)

    revalidatePath('/dashboard/team')
    return {}
}
