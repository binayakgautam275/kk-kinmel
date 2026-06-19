'use client'

import { ReactNode, useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import VideoLogo from '@/components/shared/VideoLogo'
import SoundEnableButton from '@/components/shared/SoundEnableButton'
import { createClient } from '@/lib/supabase/client'
import { setCustomNotificationSound } from '@/lib/audio'
import { useRouter } from 'next/navigation'

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
        <div className="min-h-screen flex flex-col" style={{ background: '#0f1117' }}>
            <header className="shrink-0 border-b border-white/[0.07] px-4 md:px-6 h-13 flex items-center justify-between gap-4 print:hidden"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-3 min-w-0">
                    <VideoLogo className="h-7 shrink-0" variant="dark" />
                    {restaurantName && (
                        <div className="hidden sm:block">
                            <p className="text-xs font-bold text-white/70 leading-none truncate max-w-[160px]">{restaurantName}</p>
                            <p className="text-[9px] text-white/30 font-semibold tracking-widest uppercase mt-0.5">Kitchen Display</p>
                        </div>
                    )}
                </div>

                <div className="absolute left-1/2 -translate-x-1/2">
                    <span className="font-mono text-base font-bold tabular-nums tracking-wider text-white/60">
                        {time}
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <SoundEnableButton variant="dark" />
                    {staffName && (
                        <span className="hidden md:block text-xs text-white/40 font-medium max-w-28 truncate">{staffName}</span>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-red-400 transition px-2.5 py-2 rounded-lg hover:bg-red-500/10 active:scale-95"
                    >
                        <LogOut size={14} />
                        <span className="hidden md:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    )
}
