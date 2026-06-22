import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import SettingsManager from '@/components/admin/SettingsManager'
import { getRestaurantFeatures } from '@/lib/features'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const { restaurantId, role } = await getCurrentUser()

    const adminSupabase = await createAdminClient()

    // Fetch restaurant + feature flags in parallel
    const [{ data: restaurant }, features] = await Promise.all([
        adminSupabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single(),
        getRestaurantFeatures(restaurantId),
    ])

    if (!restaurant) redirect('/unauthorized')

    // tax_rate / currency / currency_symbol live in settings.features_v2
    // (defaultTaxRate / currency / currencySymbol), NOT on the restaurants row.
    const initialRestaurant = {
        ...restaurant,
        tax_rate: features?.defaultTaxRate ?? 13,
        currency: features?.currency ?? 'NPR',
        currency_symbol: features?.currencySymbol ?? 'Rs.',
    }

    return (
        <div className="space-y-6">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                        <p className="text-gray-500 mt-1">Configure your restaurant&apos;s core information and operational rules</p>
                    </div>
                </div>
            </header>

            <SettingsManager
                initialRestaurant={initialRestaurant}
                initialFeatures={features}
                canEdit={role === 'super_admin' || role === 'manager'}
            />
        </div>
    )
}
