import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import OnboardingJoinClient from './OnboardingJoinClient'
import { createAdminClient } from '@/lib/supabase/server'

export default async function OnboardingJoinPage() {
    const currentUser = await getOptionalUser()

    if (!currentUser) {
        redirect('/login?redirect=/onboarding/join')
    }

    if (currentUser.restaurantId) {
        redirect('/admin/dashboard')
    }

    // Fetch full name
    const adminSupabase = await createAdminClient()
    const { data: userData } = await adminSupabase
        .from('users')
        .select('full_name')
        .eq('id', currentUser.id)
        .single()

    const userName = userData?.full_name || currentUser.email.split('@')[0] || 'User'

    return (
        <div className="w-full max-w-4xl mx-auto">
            <OnboardingJoinClient 
                userId={currentUser.id}
                userEmail={currentUser.email}
                userName={userName}
            />
        </div>
    )
}
