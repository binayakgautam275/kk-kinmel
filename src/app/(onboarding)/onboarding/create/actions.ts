'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getOptionalUser } from '@/lib/auth'

function normalizeSlug(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function createOnboardingRestaurant(formData: FormData) {
    const user = await getOptionalUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const restaurantName = formData.get('restaurantName') as string
    if (!restaurantName || restaurantName.trim() === '') {
        return { error: 'Restaurant name is required', field: 'restaurantName' }
    }

    const contactPhone = formData.get('contactPhone') as string
    const address = formData.get('address') as string
    const type = formData.get('type') as string
    const latitudeRaw = formData.get('latitude') as string
    const longitudeRaw = formData.get('longitude') as string

    const latitude = latitudeRaw ? parseFloat(latitudeRaw) : null
    const longitude = longitudeRaw ? parseFloat(longitudeRaw) : null
    
    const restaurantSlug = normalizeSlug(restaurantName)
    const supabase = await createAdminClient()

    // 1. Check slug uniqueness
    const { data: existingSlug } = await supabase
        .from('restaurants').select('id').eq('slug', restaurantSlug).maybeSingle()

    if (existingSlug) {
        // If exact slug exists, append a random string
        return { error: 'A restaurant with this name already exists. Try adding your city or area.', field: 'restaurantName' }
    }

    let restaurantId: string | null = null

    try {
        // 2. Create restaurant
        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .insert({
                owner_id: user.id,
                name: restaurantName.trim(),
                slug: restaurantSlug,
                contact_email: user.email,
                contact_phone: contactPhone || null,
                address: address || null,
                latitude,
                longitude,
                subscription_tier: 'free',
                subscription_status: 'active',
                max_staff: 3,
                max_menu_items: 20,
            })
            .select('id')
            .single()

        if (restaurantError || !restaurant) throw new Error(restaurantError?.message || 'Failed to create restaurant.')
        restaurantId = restaurant.id

        // 3. Upsert user row with the new restaurant_id
        // Since the user might already exist in public.users if they signed up via auth, 
        // we just update their record.
        const { error: userRowError } = await supabase.from('users').upsert({
            id: user.id,
            restaurant_id: restaurantId,
            role_id: 2, // Manager/Owner role
            is_active: true,
        }, { onConflict: 'id' })

        if (userRowError) throw new Error(userRowError.message)

        // 4. Create settings
        const { error: settingsError } = await supabase.from('settings').insert({
            restaurant_id: restaurantId,
            theme: { primaryColor: '#E85D04', secondaryColor: '#1B263B', fontFamily: 'Inter', borderRadius: '12px', menuLayout: 'grid' },
            features: { tipsEnabled: true, feedbackEnabled: true, geofenceEnabled: false, geofenceRadiusMeters: 100 },
            features_v2: {
                loyaltyEnabled: false, promosEnabled: true, takeoutEnabled: false,
                multiLanguageEnabled: false, serviceRequestsEnabled: true,
                splitBillingEnabled: true, dynamicPricingEnabled: false,
                ingredientTrackingEnabled: false, staffShiftsEnabled: false,
                defaultTaxRate: 13, currency: 'NPR', currencySymbol: 'Rs.',
                nepalPayEnabled: true, vatEnabled: false, phoneOtpEnabled: false,
                bsDateEnabled: false, tipsEnabled: true, feedbackEnabled: true,
                geofenceEnabled: false, geofenceRadiusMeters: 100
            },
            business_hours: null,
        })

        if (settingsError) throw new Error(settingsError.message)

        return { success: true }
    } catch (err: any) {
        if (restaurantId) await supabase.from('restaurants').delete().eq('id', restaurantId)
        return { error: err.message || 'Failed to create restaurant' }
    }
}
