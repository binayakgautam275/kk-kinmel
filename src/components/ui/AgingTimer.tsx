'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AgingTimerProps {
    /** ISO timestamp the order/ticket started. */
    since: string
    /** Minutes thresholds for amber / red escalation. Default 5 / 10. */
    warnAfter?: number
    dangerAfter?: number
    dark?: boolean
    showIcon?: boolean
    className?: string
}

function fmt(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Elapsed timer with color escalation for KDS: muted < warnAfter,
 * warning until dangerAfter, danger beyond. Ticks every second; respects
 * reduced-motion implicitly (it's a clock, not decoration).
 */
export default function AgingTimer({
    since,
    warnAfter = 5,
    dangerAfter = 10,
    dark,
    showIcon = true,
    className,
}: AgingTimerProps) {
    const [seconds, setSeconds] = useState(() =>
        Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000)),
    )

    useEffect(() => {
        const tick = () =>
            setSeconds(Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000)))
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [since])

    const minutes = seconds / 60
    const tone =
        minutes >= dangerAfter
            ? 'text-danger'
            : minutes >= warnAfter
              ? 'text-warning'
              : dark
                ? 'text-dark-muted'
                : 'text-ink-muted'

    return (
        <span className={cn('inline-flex items-center gap-1 text-small font-semibold tabular', tone, className)}>
            {showIcon && <Clock size={13} strokeWidth={2.5} />}
            {fmt(seconds)}
        </span>
    )
}
