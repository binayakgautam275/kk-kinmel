'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Settings } from '@/types/database'

type Features = Settings['features_v2']

const defaultFeatures: Features = {
    loyaltyEnabled: false,
    promosEnabled: true,
    takeoutEnabled: false,
    multiLanguageEnabled: false,
    serviceRequestsEnabled: true,
    splitBillingEnabled: true,
    dynamicPricingEnabled: false,
    ingredientTrackingEnabled: false,
    staffShiftsEnabled: false,
    defaultTaxRate: 13.0,
    currency: 'NPR',
    currencySymbol: 'Rs.',
    nepalPayEnabled: false,
    vatEnabled: false,
    phoneOtpEnabled: false,
    bsDateEnabled: false,
        feedbackEnabled: true,
}

const FeatureContext = createContext<Features>(defaultFeatures)

export function FeatureProvider({ features, children }: { features: Features | null; children: ReactNode }) {
    return (
        <FeatureContext.Provider value={features ?? defaultFeatures}>
            {children}
        </FeatureContext.Provider>
    )
}

export function useFeatures(): Features {
    return useContext(FeatureContext)
}

/**
 * Hook to check if a specific feature is enabled.
 * Usage: const isEnabled = useFeatureEnabled('loyaltyEnabled')
 */
export function useFeatureEnabled(key: keyof Omit<Features, 'defaultTaxRate' | 'currency' | 'currencySymbol'>): boolean {
    const features = useFeatures()
    return !!features[key]
}
