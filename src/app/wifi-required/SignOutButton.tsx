'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
    const supabase = createClient()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <button
            onClick={handleSignOut}
            className="text-xs text-slate-500 hover:text-red-400 transition duration-200 flex items-center justify-center gap-1 mx-auto cursor-pointer"
        >
            <LogOut size={12} />
            Sign Out
        </button>
    )
}
