import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import SettingsForm from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const { data: restaurant } = await adminSupabase
        .from('restaurants')
        .select('name, address, contact_phone, contact_email, pan_number, vat_registered, payment_qr_label, payment_qr_url')
        .eq('id', restaurantId)
        .single()

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
            <SettingsForm
                restaurant={{
                    name: restaurant?.name || null,
                    address: restaurant?.address || null,
                    contact_phone: restaurant?.contact_phone || null,
                    contact_email: restaurant?.contact_email || null,
                    pan_number: restaurant?.pan_number || null,
                    vat_registered: restaurant?.vat_registered || null,
                    payment_qr_label: restaurant?.payment_qr_label || null,
                    payment_qr_url: restaurant?.payment_qr_url || null,
                }}
            />
        </div>
    )
}
