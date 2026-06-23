'use client'

import { ReactNode, useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import SoundEnableButton from '@/components/shared/SoundEnableButton'
import { createClient } from '@/lib/supabase/client'
import { setCustomNotificationSound } from '@/lib/audio'
import { useRouter } from 'next/navigation'
import CommandPaletteMount from '@/components/ui/CommandPaletteMount'

interface Props {
    children: ReactNode
    restaurantName?: string
    staffName?: string
    notificationSoundUrl?: string | null
}

export default function KitchenLayoutClient({ children, restaurantName, staffName, notificationSoundUrl }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [time, setTime] = useState('')

    useEffect(() => {
        setCustomNotificationSound(notificationSoundUrl || null)
    }, [notificationSoundUrl])

    useEffect(() => {
        const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
        tick()
        const id = setInterval(tick, 10_000)
        return () => clearInterval(id)
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen flex flex-col bg-dark-bg print:bg-white print:text-black">
            <header className="shrink-0 border-b border-dark-border px-4 md:px-6 h-16 flex items-center justify-between gap-4 print:hidden bg-dark-surface">
                <div className="flex items-center gap-3 min-w-0">
                    <Logo className="h-7 shrink-0" variant="dark" />
                    {restaurantName && (
                        <div className="hidden sm:block">
                            <p className="text-small font-bold text-dark-ink leading-none truncate max-w-[160px]">{restaurantName}</p>
                            <p className="text-[10px] text-dark-muted font-semibold tracking-widest uppercase mt-0.5">Kitchen Display</p>
                        </div>
                    )}
                </div>

                <div className="absolute left-1/2 -translate-x-1/2">
                    <span className="font-mono text-base font-bold tabular tracking-wider text-dark-muted">
                        {time}
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <SoundEnableButton variant="dark" />
                    {staffName && (
                        <span className="hidden md:block text-caption text-dark-muted font-medium max-w-28 truncate">{staffName}</span>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-1.5 text-caption font-medium text-dark-muted hover:text-danger transition-colors px-2.5 py-2 rounded-[var(--r-md)] hover:bg-danger/10"
                    >
                        <LogOut size={14} />
                        <span className="hidden md:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-hidden">
                {children}
            </main>
            <CommandPaletteMount />
        </div>
    )
}
