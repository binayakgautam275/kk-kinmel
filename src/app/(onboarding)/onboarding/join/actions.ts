'use server'

import { getOptionalUser } from '@/lib/auth'

export async function checkInvitationStatus() {
    // getOptionalUser will perform a fresh DB lookup for the user's roles and restaurant_id
    const user = await getOptionalUser()
    
    // If the user now has a restaurantId, the owner has successfully invited/added them
    if (user?.restaurantId) {
        return { success: true }
    }

    return { success: false }
}
