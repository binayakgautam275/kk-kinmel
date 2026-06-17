import { ReactNode } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import SuperAdminSidebar from '@/components/admin/SuperAdminSidebar'
import AdminOrderNotifier from '@/components/admin/AdminOrderNotifier'
import SoundEnableButton from '@/components/shared/SoundEnableButton'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    // requireRole() uses the React.cache-wrapped getCurrentUser — no duplicate DB call
    // when the page also calls getCurrentUser().
    const currentUser = await requireRole('super_admin', 'manager')
    const roleNameRaw = currentUser.role || 'unknown'

    const roleDisplay = roleNameRaw
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

    const isSuperAdmin = roleNameRaw === 'super_admin'

    // Fetch restaurant name for the manager sidebar — only needed for manager role
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
        <div className="min-h-screen bg-[#F7F6F3] flex">
            {isSuperAdmin ? <SuperAdminSidebar /> : <AdminSidebar userRole={roleNameRaw} restaurantName={restaurantName} />}
            {!isSuperAdmin && currentUser.restaurantId && (
                <AdminOrderNotifier restaurantId={currentUser.restaurantId} />
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <header className="bg-white border-b border-gray-100 px-5 md:px-8 h-14 flex items-center justify-between shrink-0 shadow-sm z-10">
                    <h2 className="text-sm font-semibold text-gray-800 pl-10 md:pl-0">
                        {isSuperAdmin ? 'SaaS Control Panel' : (restaurantName || 'Management Console')}
                    </h2>
                    <div className="flex items-center gap-3">
                        {!isSuperAdmin && <SoundEnableButton variant="light" />}
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            isSuperAdmin
                                ? 'bg-[var(--color-primary)]/8 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                            {roleDisplay}
                        </span>
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
