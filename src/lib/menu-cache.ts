import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { MenuItem } from '@/types/database'

export const getCachedMenuData = unstable_cache(
    async (restaurantId: string) => {
        const supabase = await createAdminClient()

        const [
            { data: categories },
            { data: rawMenuItems },
            { data: rawTranslations },
            { data: rawLangs }
        ] = await Promise.all([
            supabase
                .from('menu_categories')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('is_visible', true)
                .order('sort_order', { ascending: true }),

            supabase
                .from('menu_items')
                .select('*, menu_item_modifier_groups(*, menu_item_modifiers(*))')
                .eq('restaurant_id', restaurantId)
                .eq('is_available', true),

            supabase
                .from('translations')
                .select('language_code, entity_type, entity_id, translated_text')
                .eq('restaurant_id', restaurantId),

            supabase
                .from('supported_languages')
                .select('language_code, language_name')
                .eq('restaurant_id', restaurantId)
                .eq('is_active', true)
                .order('sort_order'),
        ])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const menuItems = (rawMenuItems || []).map((item: Record<string, any>) => ({
            ...item,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            modifier_groups: (item.menu_item_modifier_groups || []).map((g: Record<string, any>) => ({
                ...g,
                modifiers: g.menu_item_modifiers || [],
            })),
        })) as MenuItem[]

        const translations = (rawTranslations || []) as { language_code: string; entity_type: string; entity_id: string; translated_text: string }[]
        const supportedLanguages = (rawLangs || []).map(l => ({ code: l.language_code, name: l.language_name }))

        return {
            categories: categories || [],
            menuItems,
            translations,
            supportedLanguages
        }
    },
    ['restaurant-menu-data'],
    { revalidate: 60 }
)
