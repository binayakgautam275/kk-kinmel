import { useEffect, useState } from 'react'
import { HomepageConfig } from '@/types/database'

export function useHomepageConfig(restaurantId: string) {
    const [config, setConfig] = useState<HomepageConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchConfig() {
            try {
                setIsLoading(true)
                const response = await fetch(`/api/homepage/get?restaurant_id=${restaurantId}`)
                
                if (!response.ok) {
                    throw new Error('Failed to fetch homepage config')
                }

                const data = await response.json()
                setConfig(data)
                setError(null)
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load config'
                setError(message)
                console.error('Error fetching homepage config:', err)
            } finally {
                setIsLoading(false)
            }
        }

        if (restaurantId) {
            fetchConfig()
        }
    }, [restaurantId])

    return { config, isLoading, error }
}
