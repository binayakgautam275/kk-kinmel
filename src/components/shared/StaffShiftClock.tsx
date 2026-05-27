'use client'

import { useState, useEffect, useCallback } from 'react'
import { clockIn, clockOut, getActiveShift, getShiftHistory } from '@/app/api/staff/actions'
import type { StaffShift } from '@/types/database'
import { Clock, LogIn, LogOut, History } from 'lucide-react'

interface StaffShiftClockProps {
    userId: string
    restaurantId: string
    initialShift: StaffShift | null
    initialHistory: StaffShift[]
    dark?: boolean
}

function formatDuration(start: string, end?: string | null): string {
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const diffMs = endDate.getTime() - startDate.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function StaffShiftClock({ userId, restaurantId, initialShift, initialHistory, dark }: StaffShiftClockProps) {
    const [activeShift, setActiveShift] = useState<StaffShift | null>(initialShift)
    const [history, setHistory] = useState<StaffShift[]>(initialHistory)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showHistory, setShowHistory] = useState(false)
    const [elapsedTime, setElapsedTime] = useState(
        initialShift ? formatDuration(initialShift.clock_in) : ''
    )

    const refreshData = useCallback(async () => {
        const [shift, shifts] = await Promise.all([
            getActiveShift(userId),
            getShiftHistory(userId),
        ])
        setActiveShift(shift)
        setHistory(shifts)
    }, [userId])

    // Live elapsed timer when clocked in
    useEffect(() => {
        if (!activeShift) return

        const tick = () => setElapsedTime(formatDuration(activeShift.clock_in))
        const interval = setInterval(tick, 60_000)
        return () => clearInterval(interval)
    }, [activeShift])

    async function handleClockIn() {
        setLoading(true)
        setError(null)
        const result = await clockIn(userId, restaurantId)
        if (result.error) {
            setError(result.error)
        } else {
            setActiveShift(result.shift || null)
        }
        setLoading(false)
    }

    async function handleClockOut() {
        setLoading(true)
        setError(null)
        const result = await clockOut(userId)
        if (result.error) {
            setError(result.error)
        } else {
            setActiveShift(null)
            await refreshData()
        }
        setLoading(false)
    }

    const base = dark
        ? 'bg-gray-800 border-gray-700 text-white'
        : 'bg-white border-gray-200'

    const t = {
        elapsed: dark ? 'text-white' : 'text-gray-900',
        muted: dark ? 'text-gray-400' : 'text-gray-500',
        label: dark ? 'text-gray-300' : 'text-gray-600',
        divider: dark ? 'border-gray-700' : 'border-gray-100',
        hover: dark ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
        historyRow: dark ? 'bg-gray-700/60' : 'bg-gray-50',
        historyText: dark ? 'text-gray-200' : 'text-gray-700',
        iconBg: activeShift ? 'bg-green-500/20' : dark ? 'bg-gray-700' : 'bg-gray-100',
    }

    return (
        <div className={`rounded-xl shadow-sm border overflow-hidden ${base}`}>
            {/* Current status */}
            <div className="p-4 md:p-6 text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${t.iconBg}`}>
                    <Clock className={`w-8 h-8 ${activeShift ? 'text-green-400' : dark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>

                <p className={`text-sm font-medium ${activeShift ? 'text-green-400' : t.muted}`}>
                    {activeShift ? 'Currently Clocked In' : 'Not Clocked In'}
                </p>

                {activeShift && (
                    <div className="mt-2 space-y-1">
                        <p className={`text-3xl font-bold font-mono ${t.elapsed}`}>{elapsedTime}</p>
                        <p className={`text-xs ${t.muted}`}>Since {formatTime(activeShift.clock_in)}</p>
                    </div>
                )}

                {error && (
                    <p className="mt-3 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
                )}

                {/* Clock In / Out button */}
                <div className="mt-4 md:mt-6">
                    {activeShift ? (
                        <button
                            onClick={handleClockOut}
                            disabled={loading}
                            className="w-full bg-red-600 text-white font-semibold rounded-xl py-3 md:py-4 flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            <LogOut size={18} />
                            {loading ? 'Clocking Out...' : 'Clock Out'}
                        </button>
                    ) : (
                        <button
                            onClick={handleClockIn}
                            disabled={loading}
                            className="w-full bg-green-600 text-white font-semibold rounded-xl py-3 md:py-4 flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            <LogIn size={18} />
                            {loading ? 'Clocking In...' : 'Clock In'}
                        </button>
                    )}
                </div>
            </div>

            {/* History toggle */}
            <div className={`border-t ${t.divider}`}>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`w-full px-6 py-3 flex items-center justify-between text-sm font-medium ${t.label} ${t.hover} transition-colors`}
                >
                    <span className="flex items-center gap-2">
                        <History size={16} />
                        Recent Shifts
                    </span>
                    <span className={`text-xs ${t.muted}`}>{showHistory ? 'Hide' : 'Show'}</span>
                </button>

                {showHistory && (
                    <div className="px-6 pb-4 space-y-2 max-h-64 overflow-y-auto">
                        {history.length === 0 && (
                            <p className={`text-sm text-center py-4 ${t.muted}`}>No shift history.</p>
                        )}
                        {history.filter(s => s.clock_out).map((shift) => (
                            <div key={shift.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${t.historyRow}`}>
                                <div>
                                    <span className={`font-medium ${t.historyText}`}>{formatDate(shift.clock_in)}</span>
                                    <span className={`mx-1 ${t.muted}`}>·</span>
                                    <span className={t.muted}>
                                        {formatTime(shift.clock_in)} – {shift.clock_out ? formatTime(shift.clock_out) : '—'}
                                    </span>
                                </div>
                                <span className={`font-mono ${t.label}`}>
                                    {shift.clock_out ? formatDuration(shift.clock_in, shift.clock_out) : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
