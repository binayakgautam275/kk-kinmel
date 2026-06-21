'use client'

import { ReactNode, useState, useEffect } from 'react'
import { LogOut, Volume2 } from 'lucide-react'
import Logo from '@/components/shared/Logo'
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
        <div className="min-h-screen bg-[#F7F6F3] flex flex-col">
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
                    {/* Left */}
                    <div className="flex items-center gap-3 min-w-0">
                        <Logo className="h-7 shrink-0" />
                        {restaurantName && (
                            <div className="hidden sm:block">
                                <p className="text-xs font-bold text-gray-800 leading-none truncate max-w-[160px]">{restaurantName}</p>
                                <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mt-0.5">Waiter</p>
                            </div>
                        )}
                    </div>

                    {/* Center — clock */}
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <span className="font-mono text-sm font-bold text-gray-700 tabular-nums tracking-wider">
                            {time}
                        </span>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
                        <SoundEnableButton variant="light" />
                        {staffName && (
                            <div className="hidden md:flex items-center gap-2">
                                <div className="h-4 w-px bg-gray-200" />
                                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs font-bold">
                                    {staffName[0].toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-gray-600 max-w-28 truncate">{staffName}</span>
                            </div>
                        )}
                        <div className="h-4 w-px bg-gray-200 hidden md:block" />
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 transition px-2.5 py-2 rounded-lg hover:bg-red-50 active:scale-95"
                        >
                            <LogOut size={15} />
                            <span className="hidden md:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6">
                {children}
            </main>
        </div>
    )
}
