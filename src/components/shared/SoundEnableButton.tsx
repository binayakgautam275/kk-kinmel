'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { unlockAudio, isAudioLocked, playNewOrder } from '@/lib/audio'

interface Props {
    /** Extra Tailwind classes for positioning in the parent header */
    className?: string
    /** 'dark' for kitchen header (white text), 'light' for waiter header */
    variant?: 'dark' | 'light'
}

export default function SoundEnableButton({ className = '', variant = 'light' }: Props) {
    const [locked, setLocked] = useState(false)
    const [justEnabled, setJustEnabled] = useState(false)

    useEffect(() => {
        // Check after hydration — AudioContext state is only available client-side
        setLocked(isAudioLocked())

        // Auto-unlock when user interacts with the page (click anywhere)
        const tryUnlock = async () => {
            const ok = await unlockAudio()
            if (ok) setLocked(false)
        }
        document.addEventListener('click', tryUnlock, { once: true })
        document.addEventListener('keydown', tryUnlock, { once: true })
        return () => {
            document.removeEventListener('click', tryUnlock)
            document.removeEventListener('keydown', tryUnlock)
        }
    }, [])

    // Nothing to show once unlocked (the auto-listener handles it silently)
    if (!locked && !justEnabled) return null

    const handleEnable = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const ok = await unlockAudio()
        if (ok) {
            setLocked(false)
            setJustEnabled(true)
            await playNewOrder() // play test pip so staff confirms it works
            setTimeout(() => setJustEnabled(false), 3000)
        }
    }

    const darkStyles = 'text-amber-300 bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20'
    const lightStyles = 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'

    if (justEnabled) {
        return (
            <span className={`flex items-center gap-1.5 text-caption font-medium px-2.5 py-2 rounded-[var(--r-md)] ${variant === 'dark' ? 'text-green-300' : 'text-green-600'} ${className}`}>
                <Volume2 size={13} /> Sounds on
            </span>
        )
    }

    return (
        <button
            onClick={handleEnable}
            className={`flex items-center gap-1.5 text-caption font-medium px-2.5 py-2 rounded-[var(--r-md)] border transition ${variant === 'dark' ? darkStyles : lightStyles} ${className}`}
            title="Click to enable audio notifications"
        >
            <VolumeX size={13} /> Enable sounds
        </button>
    )
}
