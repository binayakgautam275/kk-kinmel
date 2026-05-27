import { ReactNode } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import SuperAdminSidebar from '@/components/admin/SuperAdminSidebar'
import AdminOrderNotifier from '@/components/admin/AdminOrderNotifier'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    // Only super_admin and manager roles can access admin pages
    const currentUser = await requireRole('super_admin', 'manager')
    const roleNameRaw = currentUser.role || 'unknown'

    // Format role for display (e.g., "super_admin" -> "Super Admin")
    const roleDisplay = roleNameRaw
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

    const isSuperAdmin = roleNameRaw === 'super_admin'

    // Fetch restaurant name for the manager sidebar
    let restaurantName: string | undefined
    if (!isSuperAdmin && currentUser.restaurantId) {
        const adminSupabase = await createAdminClient()
        const { data } = await adminSupabase
            .from('restaurants')
            .select('name')
            .eq('id', currentUser.restaurantId)
            .single()
        restaurantName = data?.name || undefined
    }

    return (
        <div className="min-h-screen bg-gray-50 flex font-['var(--font-roboto)']">
            {isSuperAdmin ? <SuperAdminSidebar /> : <AdminSidebar userRole={roleNameRaw} restaurantName={restaurantName} />}
            {!isSuperAdmin && currentUser.restaurantId && (
                <AdminOrderNotifier restaurantId={currentUser.restaurantId} />
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 shrink-0 shadow-sm z-10">
                    <div className="flex justify-between items-center">
                        <h2 className="text-base md:text-xl font-semibold text-gray-800 pl-12 md:pl-0">
                            {isSuperAdmin ? 'SaaS Control Panel' : (restaurantName || 'Management Console')}
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs md:text-sm font-medium text-gray-500 bg-gray-100 px-2.5 md:px-3 py-1 rounded-full">
                                {roleDisplay}
                            </span>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
