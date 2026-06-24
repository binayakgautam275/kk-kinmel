'use client'

import { useState, useEffect } from 'react'
import { HomepageConfig } from '@/types/database'
import HomepageRenderer from '@/components/customer/homepage/HomepageRenderer'
import { ChevronRight, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

interface HomepageGateProps {
    restaurantId: string
    onProceed: () => void
    // When set, the homepage shows a secondary "Order Takeout / Pickup" action so a
    // guest who scanned the table QR can self-order for pickup without first tapping
    // "View Menu" to reach the no-session modal. Null hides it (e.g. no slug).
    takeoutHref?: string | null
    // Function-as-child: receives a `backToHome` callback (null when there is
    // no homepage to return to) so the menu can offer a "back to homepage" action.
    children: (opts: { backToHome: (() => void) | null }) => React.ReactNode
}

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header skeleton */}
            <div className="bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="space-y-1.5">
                    <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="w-16 h-2.5 bg-gray-100 rounded animate-pulse" />
                </div>
            </div>
            {/* Category nav skeleton */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex gap-4">
                {[60, 80, 50, 70, 55].map((w, i) => (
                    <div key={i} className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: w }} />
                ))}
            </div>
            {/* Card skeleton grid */}
            <div className="flex-1 p-4 grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse">
                        <div className="aspect-4/3 bg-gray-200" />
                        <div className="p-3 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-2.5 bg-gray-100 rounded w-full" />
                            <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                            <div className="h-8 bg-gray-200 rounded-lg w-full mt-1" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function HomepageGate({ restaurantId, onProceed, takeoutHref, children }: HomepageGateProps) {
    const [homepageConfig, setHomepageConfig] = useState<HomepageConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showHomepage, setShowHomepage] = useState(true)

    useEffect(() => {
        async function fetchHomepage() {
            try {
                const response = await fetch(`/api/homepage/get?restaurant_id=${restaurantId}`)
                if (response.ok) {
                    const config = await response.json()
                    setHomepageConfig(config)
                } else {
                    setShowHomepage(false)
                }
            } catch {
                setShowHomepage(false)
            } finally {
                setIsLoading(false)
            }
        }

        fetchHomepage()
    }, [restaurantId])

    if (isLoading) {
        return <LoadingSkeleton />
    }

    if (!showHomepage || !homepageConfig) {
        // Only offer "back to homepage" when a homepage config actually exists.
        return <>{children({ backToHome: homepageConfig ? () => setShowHomepage(true) : null })}</>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <HomepageRenderer
                config={homepageConfig}
                onMenuClick={() => {
                    setShowHomepage(false)
                    onProceed()
                }}
            />
            {/* Floating CTAs — elevated above cart bar */}
            <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2">
                {takeoutHref && (
                    <Link
                        href={takeoutHref}
                        className="px-5 py-2.5 bg-white text-primary border border-primary rounded-full shadow-lg hover:bg-primary/5 flex items-center gap-2 font-semibold text-sm"
                    >
                        <ShoppingBag size={16} />
                        Takeout / Pickup
                    </Link>
                )}
                <button
                    onClick={() => {
                        setShowHomepage(false)
                        onProceed()
                    }}
                    className="px-6 py-3 bg-primary text-white rounded-full shadow-xl shadow-primary/30 hover:opacity-90 flex items-center gap-2 font-semibold text-sm"
                >
                    View Menu
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    )
}
