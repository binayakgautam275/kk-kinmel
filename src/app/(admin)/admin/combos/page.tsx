import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import CombosManager from './CombosManager'

export const revalidate = 0

export default async function AdminCombosPage() {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    // Fetch categories and standard items (non-combos)
    const [
        { data: categories },
        { data: allItems }
    ] = await Promise.all([
        adminSupabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('sort_order', { ascending: true }),
        adminSupabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('name', { ascending: true })
    ])

    // Fetch combo items with error handling in case the tables aren't migrated yet
    let combos: any[] = []
    let comboItems: any[] = []
    let isDbReady = true
    let dbError = ''

    try {
        // We select is_combo to see if it exists
        const { data: combosData, error: combosErr } = await adminSupabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_combo', true)
            .order('name')

        if (combosErr) throw combosErr
        combos = combosData || []

        const { data: comboItemsData, error: itemsErr } = await adminSupabase
            .from('combo_items')
            .select('id, combo_id, item_id, quantity')

        if (itemsErr) throw itemsErr
        comboItems = comboItemsData || []
    } catch (err: any) {
        console.warn('Combo Offers database tables or columns do not exist yet:', err.message)
        isDbReady = false
        dbError = err.message
    }

    // Filter standard items to exclude combos (so they don't list a combo inside a combo)
    const standardItems = (allItems || []).filter(item => !item.is_combo)

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">Combo Offers</h1>
                <p className="text-gray-500 mt-1">Bundle multiple menu items together and sell them at a special package price.</p>
            </div>

            <CombosManager
                initialCombos={combos}
                initialComboItems={comboItems}
                categories={categories || []}
                menuItems={standardItems}
                restaurantId={restaurantId}
                isDbReady={isDbReady}
                dbError={dbError}
            />
        </div>
    )
}
