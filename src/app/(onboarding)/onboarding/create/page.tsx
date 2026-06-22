import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import OnboardingCreateClient from './OnboardingCreateClient'

export default async function OnboardingCreatePage() {
    const currentUser = await getOptionalUser()

    if (!currentUser) {
        redirect('/login?redirect=/onboarding/create')
    }

    if (currentUser.restaurantId) {
        redirect('/admin/dashboard')
    }

    return (
        <OnboardingCreateClient />
    )
}
