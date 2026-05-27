import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'

export default async function AdminIndexPage() {
    const user = await getOptionalUser()
    if (user?.role === 'super_admin') {
        redirect('/admin/super-admin/dashboard')
    }
    redirect('/admin/dashboard')
}
