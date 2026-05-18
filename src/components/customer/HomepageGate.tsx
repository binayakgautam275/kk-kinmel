'use client'

import { useState, useEffect } from 'react'
import { HomepageConfig } from '@/types/database'
import HomepageRenderer from '@/components/customer/homepage/HomepageRenderer'
import { ChevronRight } from 'lucide-react'

interface HomepageGateProps {
    restaurantId: string
    onProceed: () => void
    children: React.ReactNode
}

export default function HomepageGate({ restaurantId, onProceed, children }: HomepageGateProps) {
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
                    // No homepage config, go straight to menu
                    setShowHomepage(false)
                }
            } catch (error) {
                console.error('Error loading homepage:', error)
                setShowHomepage(false)
            } finally {
                setIsLoading(false)
            }
        }

        fetchHomepage()
    }, [restaurantId])

    if (isLoading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
    }

    if (!showHomepage || !homepageConfig) {
        return <>{children}</>
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
            <div className="fixed bottom-6 right-6">
                <button
                    onClick={() => {
                        setShowHomepage(false)
                        onProceed()
                    }}
                    className="px-6 py-3 bg-primary text-white rounded-full shadow-lg hover:opacity-90 flex items-center gap-2 font-semibold"
                >
                    View Menu
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    )
}
