'use server'

import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateInput, CreateTenantSchema } from '@/lib/validation'

const TIER_LIMITS: Record<'free' | 'basic' | 'pro' | 'enterprise', { max_staff: number; max_menu_items: number }> = {
    free: { max_staff: 3, max_menu_items: 20 },
    basic: { max_staff: 10, max_menu_items: 100 },
    pro: { max_staff: 50, max_menu_items: 500 },
    enterprise: { max_staff: 999, max_menu_items: 9999 },
}

const TIER_FEATURES: Record<'free' | 'basic' | 'pro' | 'enterprise', {
    loyaltyEnabled: boolean
    promosEnabled: boolean
    takeoutEnabled: boolean
    multiLanguageEnabled: boolean
    serviceRequestsEnabled: boolean
    splitBillingEnabled: boolean
    dynamicPricingEnabled: boolean
    ingredientTrackingEnabled: boolean
    staffShiftsEnabled: boolean
}> = {
    free: {
        loyaltyEnabled: false,
        promosEnabled: true,
        takeoutEnabled: false,
        multiLanguageEnabled: false,
        serviceRequestsEnabled: true,
        splitBillingEnabled: true,
        dynamicPricingEnabled: false,
        ingredientTrackingEnabled: false,
        staffShiftsEnabled: false,
    },
    basic: {
        loyaltyEnabled: false,
        promosEnabled: true,
        takeoutEnabled: true,
        multiLanguageEnabled: false,
        serviceRequestsEnabled: true,
        splitBillingEnabled: true,
        dynamicPricingEnabled: false,
        ingredientTrackingEnabled: false,
        staffShiftsEnabled: false,
    },
    pro: {
        loyaltyEnabled: true,
        promosEnabled: true,
        takeoutEnabled: true,
        multiLanguageEnabled: false,
        serviceRequestsEnabled: true,
        splitBillingEnabled: true,
        dynamicPricingEnabled: true,
        ingredientTrackingEnabled: true,
        staffShiftsEnabled: true,
    },
    enterprise: {
        loyaltyEnabled: true,
        promosEnabled: true,
        takeoutEnabled: true,
        multiLanguageEnabled: true,
        serviceRequestsEnabled: true,
        splitBillingEnabled: true,
        dynamicPricingEnabled: true,
        ingredientTrackingEnabled: true,
        staffShiftsEnabled: true,
    },
}

const DEFAULT_THEME = {
    primaryColor: '#E85D04',
    secondaryColor: '#1B263B',
    fontFamily: 'Inter',
    borderRadius: '12px',
    menuLayout: 'grid',
}

const DEFAULT_FEATURES = {
    tipsEnabled: true,
    feedbackEnabled: true,
    geofenceEnabled: false,
    geofenceRadiusMeters: 100,
}

export interface CreateTenantInput {
    restaurantName: string
    restaurantSlug: string
    ownerFullName: string
    ownerEmail: string
    ownerPassword: string
    contactPhone?: string
    address?: string
    subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise'
}

function normalizeSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function buildDefaultFeaturesV2(tier: 'free' | 'basic' | 'pro' | 'enterprise') {
    return {
        ...TIER_FEATURES[tier],
        defaultTaxRate: 13,
        currency: 'NPR',
        currencySymbol: 'Rs.',
        nepalPayEnabled: true,
        vatEnabled: false,
        phoneOtpEnabled: false,
        bsDateEnabled: false,
    }
}

export async function getAllRestaurants() {
    const supabase = await createAdminClient()
    
    try {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('getAllRestaurants error:', error)
            return { error: error.message, data: null }
        }
        
        // If we have data, fetch owner emails separately if needed
        if (data && data.length > 0) {
            const ownerIds = data.filter(r => r.owner_id).map(r => r.owner_id)
            
            if (ownerIds.length > 0) {
                // Fetch each owner's email individually to avoid listUsers() pagination cap
                const emailMap = new Map<string, string | null>()
                await Promise.all(
                    ownerIds.map(async (id) => {
                        const { data: u } = await supabase.auth.admin.getUserById(id)
                        emailMap.set(id, u?.user?.email ?? null)
                    })
                )

                return {
                    data: data.map(r => ({
                        ...r,
                        users: r.owner_id ? { email: emailMap.get(r.owner_id) || null } : null
                    }))
                }
            }
        }
        
        return { data }
    } catch (err) {
        console.error('getAllRestaurants exception:', err)
        return { error: 'Failed to fetch restaurants', data: null }
    }
}

export async function suspendRestaurant(restaurantId: string, suspend: boolean) {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('restaurants')
        .update({ is_suspended: suspend })
        .eq('id', restaurantId)

    if (error) return { error: error.message }

    revalidatePath('/admin/super-admin')
    return { success: true }
}

export async function updateSubscriptionTier(
    restaurantId: string,
    tier: 'free' | 'basic' | 'pro' | 'enterprise'
) {
    const supabase = await createAdminClient()

    // Define limits per tier
    const limits = TIER_LIMITS[tier]

    const { error } = await supabase
        .from('restaurants')
        .update({
            subscription_tier: tier,
            max_staff: limits.max_staff,
            max_menu_items: limits.max_menu_items,
        })
        .eq('id', restaurantId)

    if (error) return { error: error.message }

    revalidatePath('/admin/super-admin')
    return { success: true }
}

export async function createTenantWithOwner(input: CreateTenantInput) {
    await requireRole('super_admin')

    // Validate input against schema
    const validation = validateInput(CreateTenantSchema, input)
    if (!validation.success) {
        console.warn('Tenant creation validation failed:', validation.error)
        return { error: `Invalid input: ${validation.error}` }
    }

    const validatedInput = validation.data!
    const restaurantName = validatedInput.restaurantName.trim()
    const ownerFullName = validatedInput.ownerFullName.trim()
    const ownerEmail = validatedInput.ownerEmail.trim().toLowerCase()
    const ownerPassword = validatedInput.ownerPassword.trim()
    const restaurantSlug = normalizeSlug(validatedInput.restaurantSlug || validatedInput.restaurantName)
    const contactPhone = validatedInput.contactPhone?.trim() || null
    const address = validatedInput.address?.trim() || null
    const subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise' = validatedInput.subscriptionTier || 'free'

    const supabase = await createAdminClient()
    const limits = TIER_LIMITS[subscriptionTier]
    let authUserId: string | null = null
    let restaurantId: string | null = null

    const [{ data: existingRestaurant }, { data: existingOwnerData }] = await Promise.all([
        supabase.from('restaurants').select('id').eq('slug', restaurantSlug).maybeSingle(),
        supabase.auth.admin.getUserByEmail(ownerEmail),
    ])

    if (existingRestaurant) {
        return { error: 'That restaurant slug is already in use.' }
    }

    if (existingOwnerData?.user) {
        return { error: 'That owner email already has an account.' }
    }

    try {
        const { data: createdAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
            email: ownerEmail,
            password: ownerPassword,
            email_confirm: true,
            user_metadata: {
                full_name: ownerFullName,
            },
        })

        if (createAuthError || !createdAuthUser.user) {
            return { error: createAuthError?.message || 'Failed to create owner auth account.' }
        }

        authUserId = createdAuthUser.user.id

        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .insert({
                owner_id: authUserId,
                name: restaurantName,
                slug: restaurantSlug,
                contact_email: ownerEmail,
                contact_phone: contactPhone,
                address,
                subscription_tier: subscriptionTier,
                subscription_status: 'active',
                max_staff: limits.max_staff,
                max_menu_items: limits.max_menu_items,
            })
            .select('id, name, slug, is_active, is_suspended, subscription_tier, max_staff, max_menu_items, created_at')
            .single()

        if (restaurantError || !restaurant) {
            throw new Error(restaurantError?.message || 'Failed to create restaurant row.')
        }

        restaurantId = restaurant.id

        // Wait a moment for auth trigger to create user record
        await new Promise(resolve => setTimeout(resolve, 500))

        const { error: userRowError } = await supabase
            .from('users')
            .upsert({
                id: authUserId,
                restaurant_id: restaurantId,
                full_name: ownerFullName,
                role_id: 2,
                is_active: true,
            }, { onConflict: 'id' })

        if (userRowError) {
            throw new Error(userRowError.message)
        }

        const { error: settingsError } = await supabase
            .from('settings')
            .insert({
                restaurant_id: restaurantId,
                theme: DEFAULT_THEME,
                features: DEFAULT_FEATURES,
                features_v2: buildDefaultFeaturesV2(subscriptionTier),
                business_hours: null,
            })

        if (settingsError) {
            throw new Error(settingsError.message)
        }

        revalidatePath('/admin/super-admin')

        return {
            success: true,
            restaurant: {
                ...restaurant,
                users: { email: ownerEmail },
            },
            owner: {
                id: authUserId,
                email: ownerEmail,
                full_name: ownerFullName,
            },
        }
    } catch (error) {
        if (restaurantId) {
            await supabase.from('restaurants').delete().eq('id', restaurantId)
        }

        if (authUserId) {
            await supabase.auth.admin.deleteUser(authUserId)
        }

        return {
            error: error instanceof Error ? error.message : 'Failed to create tenant.',
        }
    }
}

export async function sendPasswordResetEmail(userId: string, ownerEmail: string) {
    await requireRole('super_admin')

    const supabase = await createAdminClient()

    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: ownerEmail,
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    return {
        success: true,
        message: `Password reset link sent to ${ownerEmail}. They can use this link to set a new password.`,
    }
}

export async function updateOwnerContact(
    userId: string,
    updates: {
        email?: string
        phone?: string
    }
) {
    await requireRole('super_admin')

    const supabase = await createAdminClient()

    if (updates.email) {
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(updates.email.toLowerCase())
        if (existingUser?.user && existingUser.user.id !== userId) {
            return { error: 'That email is already registered to another user.' }
        }
    }

    const updatePayload: Record<string, string | null> = {}
    if (updates.email) updatePayload.email = updates.email.trim().toLowerCase()
    if (updates.phone !== undefined) updatePayload.phone = updates.phone?.trim() || null

    const { error } = await supabase.auth.admin.updateUserById(userId, updatePayload as Parameters<typeof supabase.auth.admin.updateUserById>[1])

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/super-admin')
    return { success: true }
}

export async function getSaasMetrics() {
    const supabase = await createAdminClient()

    const [
        { count: totalRestaurants },
        { count: activeRestaurants },
        { count: totalOrders },
        { data: tierBreakdown },
    ] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('restaurants').select('subscription_tier'),
    ])

    // Count by tier
    const tiers: Record<string, number> = { free: 0, basic: 0, pro: 0, enterprise: 0 }
    tierBreakdown?.forEach((r: { subscription_tier?: string }) => {
        const tier = r.subscription_tier || 'free'
        tiers[tier] = (tiers[tier] || 0) + 1
    })

    return {
        totalRestaurants: totalRestaurants || 0,
        activeRestaurants: activeRestaurants || 0,
        totalOrders: totalOrders || 0,
        tierBreakdown: tiers,
    }
}
