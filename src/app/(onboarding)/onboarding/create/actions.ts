'use server'

import { getOptionalUser } from '@/lib/auth'
import { provisionRestaurant } from '@/lib/provisioning'

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

    const contactPhone = (formData.get('contactPhone') as string) || null
    const address = (formData.get('address') as string) || null
    const latitudeRaw = formData.get('latitude') as string
    const longitudeRaw = formData.get('longitude') as string
    const latitude = latitudeRaw ? parseFloat(latitudeRaw) : null
    const longitude = longitudeRaw ? parseFloat(longitudeRaw) : null

    const result = await provisionRestaurant({
        ownerId: user.id,
        ownerEmail: user.email,
        ownerName: user.email || 'Owner',
        name: restaurantName.trim(),
        slug: normalizeSlug(restaurantName),
        contactPhone,
        address,
        latitude,
        longitude,
        tier: 'free',
    })

    if (result.error) {
        return { error: result.error, field: result.field }
    }

    return { success: true }
}
