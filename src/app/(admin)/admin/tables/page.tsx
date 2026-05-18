import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import TableManager from '@/components/admin/TableManager'

export const dynamic = 'force-dynamic'

export default async function TablesManagementPage() {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const { data: tables } = await adminSupabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('label', { ascending: true })

    // Also get the base URL for generating the full QR link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return (
        <div className="space-y-6">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
                        <p className="text-gray-500 mt-1">Configure restaurant tables and generate QR ordering codes</p>
                    </div>
                </div>
            </header>

            <TableManager
                initialTables={tables || []}
                restaurantId={restaurantId}
                appUrl={appUrl}
            />
        </div>
    )
}
