'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Admin Error Boundary:', error)
        Sentry.captureException(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-2xl shadow-sm border border-red-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
                An error occurred while loading this section. You can try recovering the page or returning to the dashboard.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                    <RefreshCcw size={18} /> Try again
                </button>
            </div>
            {error.message && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left w-full max-w-2xl overflow-auto text-xs font-mono text-gray-600 border border-gray-200">
                    {error.message}
                </div>
            )}
        </div>
    )
}
