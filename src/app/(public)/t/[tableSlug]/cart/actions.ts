'use server'

import { getCachedMenuData } from '@/lib/menu-cache'
import type { MenuItem } from '@/types/database'

/**
 * Menu items (with correctly-shaped modifier_groups) for the cart's edit sheet.
 * Reuses the cached server loader so the relationship names are correct and the
 * data isn't gated by anon RLS — the previous client-side query joined
 * non-existent `modifier_groups`/`modifiers` relations and silently returned
 * nothing, which broke "edit item" with "Unable to edit this item right now."
 */
export async function getMenuItemsForCart(restaurantId: string): Promise<MenuItem[]> {
    if (!restaurantId) return []
    const { menuItems } = await getCachedMenuData(restaurantId)
    return menuItems
}
