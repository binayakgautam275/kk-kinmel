'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { validateInput, PublicSignupSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/ratelimit'
import { sendOnboardingEmail } from '@/lib/email'

const TIER_LIMITS = {
    free:       { max_staff: 3,   max_menu_items: 20   },
    basic:      { max_staff: 10,  max_menu_items: 100  },
    pro:        { max_staff: 50,  max_menu_items: 500  },
    enterprise: { max_staff: 999, max_menu_items: 9999 },
} as const

const TIER_FEATURES = {
    free: {
        loyaltyEnabled: false, promosEnabled: true, takeoutEnabled: false,
        multiLanguageEnabled: false, serviceRequestsEnabled: true,
        splitBillingEnabled: true, dynamicPricingEnabled: false,
        ingredientTrackingEnabled: false, staffShiftsEnabled: false,
    },
    basic: {
        loyaltyEnabled: false, promosEnabled: true, takeoutEnabled: true,
        multiLanguageEnabled: false, serviceRequestsEnabled: true,
        splitBillingEnabled: true, dynamicPricingEnabled: false,
        ingredientTrackingEnabled: false, staffShiftsEnabled: false,
    },
    pro: {
        loyaltyEnabled: true, promosEnabled: true, takeoutEnabled: true,
        multiLanguageEnabled: false, serviceRequestsEnabled: true,
        splitBillingEnabled: true, dynamicPricingEnabled: true,
        ingredientTrackingEnabled: true, staffShiftsEnabled: true,
    },
    enterprise: {
        loyaltyEnabled: true, promosEnabled: true, takeoutEnabled: true,
        multiLanguageEnabled: true, serviceRequestsEnabled: true,
        splitBillingEnabled: true, dynamicPricingEnabled: true,
        ingredientTrackingEnabled: true, staffShiftsEnabled: true,
    },
} as const

function buildFeaturesV2(tier: keyof typeof TIER_FEATURES) {
    return {
        ...TIER_FEATURES[tier],
        defaultTaxRate: 13,
        currency: 'NPR',
        currencySymbol: 'Rs.',
        nepalPayEnabled: true,
        vatEnabled: false,
        phoneOtpEnabled: false,
        bsDateEnabled: false,
        tipsEnabled: true,
        feedbackEnabled: true,
        geofenceEnabled: false,
        geofenceRadiusMeters: 100,
    }
}

function normalizeSlug(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export interface SignupResult {
    success?: boolean
    error?: string
    field?: string
}

export async function signupRestaurant(input: unknown): Promise<SignupResult> {
    // Rate limit: 3 signups per hour per IP
    const rateLimitError = await checkRateLimit('SIGNUP', 3, 3600)
    if (rateLimitError) return { error: rateLimitError }

    const validation = validateInput(PublicSignupSchema, input)
    if (!validation.success) {
        return { error: `Invalid input: ${validation.error}` }
    }

    const data = validation.data!
    const restaurantName  = data.restaurantName.trim()
    const ownerFullName   = data.ownerFullName.trim()
    const ownerEmail      = data.ownerEmail.trim().toLowerCase()
    const ownerPassword   = data.ownerPassword.trim()
    const restaurantSlug  = normalizeSlug(data.restaurantSlug || data.restaurantName)
    const contactPhone    = data.contactPhone?.trim() || null
    const address         = data.address?.trim() || null
    const tier            = (data.subscriptionTier || 'free') as keyof typeof TIER_LIMITS
    const panNumber       = data.panNumber?.trim() || null
    const vatRegistered   = data.vatRegistered ?? false

    const supabase = await createAdminClient()
    const limits = TIER_LIMITS[tier]

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
        .from('restaurants').select('id').eq('slug', restaurantSlug).maybeSingle()

    if (existingSlug) return { error: 'That restaurant URL slug is already taken. Please choose another.', field: 'restaurantSlug' }

    let authUserId: string | null = null
    let restaurantId: string | null = null

    try {
        // 1. Create auth user — returns specific error if email already exists
        const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
            email: ownerEmail,
            password: ownerPassword,
            email_confirm: true,
            user_metadata: { full_name: ownerFullName },
        })
        if (authError || !createdUser.user) {
            const isEmailTaken = authError?.message?.toLowerCase().includes('already registered') ||
                authError?.message?.toLowerCase().includes('already been registered')
            return {
                error: isEmailTaken ? 'That email is already registered. Try logging in instead.' : (authError?.message || 'Failed to create account. Please try again.'),
                field: isEmailTaken ? 'ownerEmail' : undefined,
            }
        }
        authUserId = createdUser.user.id

        // 2. Create restaurant row
        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .insert({
                owner_id: authUserId,
                name: restaurantName,
                slug: restaurantSlug,
                contact_email: ownerEmail,
                contact_phone: contactPhone,
                address,
                pan_number: panNumber,
                vat_registered: vatRegistered,
                subscription_tier: tier,
                subscription_status: 'active',
                max_staff: limits.max_staff,
                max_menu_items: limits.max_menu_items,
            })
            .select('id')
            .single()

        if (restaurantError || !restaurant) {
            throw new Error(restaurantError?.message || 'Failed to create restaurant.')
        }
        restaurantId = restaurant.id

        // 3. Wait briefly for auth trigger, then upsert users row
        await new Promise(r => setTimeout(r, 400))
        const { error: userRowError } = await supabase.from('users').upsert({
            id: authUserId,
            restaurant_id: restaurantId,
            full_name: ownerFullName,
            role_id: 2, // manager/owner
            is_active: true,
        }, { onConflict: 'id' })

        if (userRowError) throw new Error(userRowError.message)

        // 4. Create settings row with tier-appropriate feature flags
        const { error: settingsError } = await supabase.from('settings').insert({
            restaurant_id: restaurantId,
            theme: { primaryColor: '#E85D04', secondaryColor: '#1B263B', fontFamily: 'Inter', borderRadius: '12px', menuLayout: 'grid' },
            features: { tipsEnabled: true, feedbackEnabled: true, geofenceEnabled: false, geofenceRadiusMeters: 100 },
            features_v2: buildFeaturesV2(tier),
            business_hours: null,
        })

        if (settingsError) throw new Error(settingsError.message)

        // 5. Send welcome email (best-effort — don't fail signup if email fails)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.com'
        sendOnboardingEmail(ownerEmail, restaurantName, ownerFullName, `${appUrl}/admin/dashboard`).catch(() => {})

        return { success: true }

    } catch (error) {
        // Rollback: delete restaurant and auth user if anything failed
        if (restaurantId) await supabase.from('restaurants').delete().eq('id', restaurantId)
        if (authUserId) await supabase.auth.admin.deleteUser(authUserId)
        return { error: error instanceof Error ? error.message : 'Signup failed. Please try again.' }
    }
}
