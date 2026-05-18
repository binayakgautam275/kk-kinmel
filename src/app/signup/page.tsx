import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import SignupForm from './SignupForm'

export const metadata = {
    title: 'Create Your Restaurant — The House',
    description: 'Sign up and get your restaurant live in minutes.',
}

export default async function SignupPage() {
    const user = await getOptionalUser()
    if (user) redirect('/admin/dashboard')

    return <SignupForm />
}
