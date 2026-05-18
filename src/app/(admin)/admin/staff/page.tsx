import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import StaffManager from '@/components/admin/StaffManager'

export const dynamic = 'force-dynamic'

export default async function StaffManagementPage() {
    const { id: userId, restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    // Get current user's role
    const { data: currentUserData } = await adminSupabase
        .from('users')
        .select('role_id, roles(name)')
        .eq('id', userId)
        .single()

    const currentUserRole = (currentUserData?.roles as unknown as { name: string } | null)?.name || ''

    // 2. Fetch all roles available
    const { data: roles } = await adminSupabase
        .from('roles')
        .select('*')
        .order('id', { ascending: true })

    // 3. Fetch all staff for this restaurant (excluding customers if any)
    const { data: staffMembers } = await adminSupabase
        .from('users')
        .select(`
            id,
            full_name,
            avatar_url,
            is_active,
            role_id,
            created_at,
            roles (
                id,
                name,
                description
            )
        `)
        .eq('restaurant_id', restaurantId)
        .neq('role_id', 5) // Exclude standard customers from the staff dashboard
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Staff Accounts</h1>
                        <p className="text-gray-500 mt-1">Manage employee access and roles</p>
                    </div>
                </div>
            </header>

            <StaffManager
                initialStaff={staffMembers || []}
                roles={roles || []}
                currentUserRole={currentUserRole}
                currentUserId={userId}
                restaurantId={restaurantId}
            />
        </div>
    )
}
