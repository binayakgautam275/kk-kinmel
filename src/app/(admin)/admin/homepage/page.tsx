import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import HomepageManager from '@/components/admin/HomepageManager'

export const dynamic = 'force-dynamic'

export default async function HomepagePage() {
    const { restaurantId, role } = await getCurrentUser()

    if (role !== 'manager' && role !== 'super_admin') {
        redirect('/unauthorized')
    }

    const adminSupabase = await createAdminClient()

    // Fetch the restaurant to verify it exists
    const { data: restaurant, error } = await adminSupabase
        .from('restaurants')
        .select('id, name')
        .eq('id', restaurantId)
        .single()

    if (!restaurant || error) {
        redirect('/unauthorized')
    }

    return (
        <div className="space-y-6">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Homepage Manager</h1>
                        <p className="text-gray-600 mt-1">Customize your restaurant&apos;s homepage that customers see when they scan the QR code</p>
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-lg shadow">
                <HomepageManager restaurantId={restaurantId} />
            </div>
        </div>
    )
}
