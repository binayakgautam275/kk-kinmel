import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import { LoginForm } from './LoginForm'

// Role → landing page map
const ROLE_LANDING: Record<string, string> = {
    super_admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    kitchen: '/kitchen',
    waiter: '/waiter',
    onboarding: '/onboarding',
}

export default async function LoginPage(props: { searchParams: Promise<{ redirect?: string }> }) {
    const searchParams = await props.searchParams
    const redirectTo = searchParams.redirect || '/admin/dashboard'

    // If already logged in, redirect to appropriate dashboard
    const currentUser = await getOptionalUser()
    if (currentUser) {
        const landing = ROLE_LANDING[currentUser.role] || '/admin/dashboard'
        redirect(landing)
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(circle,#EAEAEA_1.6px,#fafafb_1.6px)] bg-[size:28px_28px] overflow-auto p-4 sm:p-12">
            <LoginForm redirectTo={redirectTo} />
        </div>
    )
}
