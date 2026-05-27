'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { openSession, closeSession } from '@/app/(staff)/waiter/actions'
import { Users, QrCode, PowerOff, Power } from 'lucide-react'
import type { Table, Session } from '@/types/database'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-hot-toast'
import { useConfirmStore } from '@/lib/stores/confirm'

export type TableWithSession = Table & {
    activeSession?: Session | null
}

export default function TableManager({ initialTables, restaurantId, appUrl }: { initialTables: TableWithSession[], restaurantId: string, appUrl: string }) {
    const [tables, setTables] = useState<TableWithSession[]>(initialTables)
    const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const supabaseRef = useRef(createClient())
    const { confirm } = useConfirmStore()

    useEffect(() => {
        const supabase = supabaseRef.current
        // Listen for session changes and update state reactively (no page reload)
        const channel = supabase
            .channel(`waiter-sessions-${restaurantId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sessions', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    // New session opened — update the matching table
                    const newSession = payload.new as Session
                    setTables(prev => prev.map(t =>
                        t.id === newSession.table_id
                            ? { ...t, activeSession: newSession }
                            : t
                    ))
                    // Update selected table if it's the one that changed
                    setSelectedTable(prev =>
                        prev?.id === newSession.table_id
                            ? { ...prev, activeSession: newSession }
                            : prev
                    )
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const updatedSession = payload.new as Session
                    const isClosed = updatedSession.status === 'closed' || updatedSession.status === 'expired'

                    setTables(prev => prev.map(t => {
                        if (t.activeSession && t.activeSession.id === updatedSession.id) {
                            return { ...t, activeSession: isClosed ? null : updatedSession }
                        }
                        return t
                    }))
                    setSelectedTable(prev => {
                        if (prev?.activeSession?.id === updatedSession.id) {
                            return { ...prev, activeSession: isClosed ? null : updatedSession }
                        }
                        return prev
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [restaurantId])

    const handleOpenSession = async (tableId: string) => {
        setIsProcessing(true)
        await openSession(tableId, restaurantId)
        toast.success('Session opened')
        setIsProcessing(false)
    }

    const handleCloseSession = async (sessionId: string) => {
        const isOk = await confirm({
            title: 'Close Session?',
            message: 'Are you sure you want to close this session? Customers will no longer be able to order and the table will be cleared.',
            confirmText: 'Close Session',
            isDestructive: true
        })
        if (!isOk) return

        setIsProcessing(true)
        await closeSession(sessionId)
        toast.success('Session closed')
        setIsProcessing(false)
        setSelectedTable(null)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table Grid (2/3 width on desktop) */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Active Floor Plan</h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {tables.map(table => {
                        const isActive = !!table.activeSession
                        const isSelected = selectedTable?.id === table.id

                        return (
                            <button
                                key={table.id}
                                onClick={() => setSelectedTable(table)}
                                className={`
                  relative aspect-square rounded-xl p-4 flex flex-col items-center justify-center transition-all border-2
                  ${isSelected ? 'ring-4 ring-gray-200 scale-105 z-10' : 'hover:scale-105'}
                  ${isActive
                                        ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 shadow-sm'}
                `}
                            >
                                <span className="text-2xl font-bold mb-1">{table.label}</span>
                                <div className="flex items-center gap-1 text-sm font-medium">
                                    <Users size={14} />
                                    <span>{table.capacity || '-'}</span>
                                </div>

                                {/* Status Indicator */}
                                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Action Panel (1/3 width on desktop) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit sticky top-6">
                {selectedTable ? (
                    <div className="space-y-6">
                        <div className="text-center pb-6 border-b border-gray-100">
                            <h3 className="text-2xl font-bold text-gray-900">Table {selectedTable.label}</h3>
                            <p className="text-gray-500 font-medium mt-1">
                                {selectedTable.activeSession ? 'Session Active' : 'Available'}
                            </p>
                        </div>

                        {selectedTable.activeSession ? (
                            <div className="space-y-6">
                                <div className="flex justify-center p-4 bg-gray-50 rounded-xl">
                                    {/* QR Code dynamically generated containing table token AND session token */}
                                    <QRCodeSVG
                                        value={`${appUrl}/t/${selectedTable.qr_token}?s=${selectedTable.activeSession.session_token}`}
                                        size={200}
                                        level="Q"
                                        includeMargin={true}
                                    />
                                </div>
                                <p className="text-sm text-center text-gray-600 font-medium">
                                    Scan to order. Session ends in 4 hours.
                                </p>

                                <button
                                    onClick={() => handleCloseSession(selectedTable.activeSession!.id)}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                                >
                                    <PowerOff size={18} /> Close Session & Checkout
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 py-8">
                                <div className="flex justify-center text-gray-300">
                                    <QrCode size={120} strokeWidth={1} />
                                </div>
                                <p className="text-center text-gray-500">
                                    Seat customers at this table to generate a new ordering QR code.
                                </p>

                                <button
                                    onClick={() => handleOpenSession(selectedTable.id)}
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-[var(--color-secondary)] hover:bg-[var(--color-primary)] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
                                >
                                    <Power size={18} /> Open New Session
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                        <UtensilsIcon size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">Select a table to manage</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function UtensilsIcon({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
    )
}
