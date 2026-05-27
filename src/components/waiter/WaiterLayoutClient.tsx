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

export default function WaiterLayoutClient({ children, restaurantName, staffName, notificationSoundUrl }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [time, setTime] = useState('')

    // Register custom notification sound if configured
    useEffect(() => {
        setCustomNotificationSound(notificationSoundUrl || null)
    }, [notificationSoundUrl])

    // Live clock
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
        <div className="min-h-screen bg-gray-50 flex flex-col font-['var(--font-roboto)']">
            {/* Top Navbar */}
            <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-2.5 md:py-3 shrink-0 flex items-center justify-between shadow-sm gap-3">
                {/* Left: logo + restaurant */}
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <VideoLogo className="h-7 shrink-0" />
                    <div className="hidden sm:flex flex-col leading-tight min-w-0">
                        {restaurantName && (
                            <span className="text-xs font-semibold text-gray-800 truncate">{restaurantName}</span>
                        )}
                        <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Waiter</span>
                    </div>
                </div>

                {/* Center: live clock */}
                <span className="font-mono text-sm md:text-base font-semibold text-gray-600 tracking-wide tabular-nums">
                    {time}
                </span>

                {/* Right: sound toggle + staff name + sign out */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <SoundEnableButton variant="light" />
                    {staffName && (
                        <span className="hidden md:block text-xs text-gray-500 font-medium max-w-30 truncate">
                            {staffName}
                        </span>
                    )}
                    <div className="h-4 w-px bg-gray-300 hidden md:block" />
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition active:scale-95 p-2 md:px-3 md:py-1.5 rounded-lg hover:bg-red-50"
                    >
                        <LogOut size={16} />
                        <span className="hidden md:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6">
                {children}
            </main>
        </div>
    )
}
