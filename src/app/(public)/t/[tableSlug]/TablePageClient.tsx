'use client'

import { useState } from 'react'
import HomepageGate from '@/components/customer/HomepageGate'
import type { MenuItem, MenuCategory } from '@/types/database'
import MenuSection from '@/components/customer/MenuSection'
import CartSummary from '@/components/customer/CartSummary'
import ServiceRequestPanel from '@/components/customer/ServiceRequestPanel'
import VideoLogo from '@/components/shared/VideoLogo'

interface TablePageClientProps {
    tableData: {
        id: string
        label: string
        qr_token: string
        restaurant_id: string
        restaurants: { name: string; logo_url: string | null } | null
    }
    categories: MenuCategory[]
    menuItems: MenuItem[]
    sessionToken: string | undefined
    sessionUUID: string | undefined
    isValidSession: boolean
    serviceRequestsEnabled: boolean
}

export default function TablePageClient({
    tableData,
    categories,
    menuItems,
    sessionToken,
    sessionUUID,
    isValidSession,
    serviceRequestsEnabled,
}: TablePageClientProps) {
    const [showMenu, setShowMenu] = useState(!isValidSession) // Show menu immediately if no session, otherwise start with homepage

    const restaurantName = tableData.restaurants?.name || 'Smart Restaurant'

    const menuContent = (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="bg-white px-4 py-6 shadow-sm sticky top-0 z-20">
                <div className="flex justify-between items-center max-w-2xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold font-['var(--font-family)'] text-[var(--color-secondary)]">
                            {restaurantName}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">
                            Table • {tableData.label}
                            {!isValidSession && (
                                <span className="ml-2 text-red-500">(View Only)</span>
                            )}
                        </p>
                    </div>
                    <div className="h-10 w-auto shrink-0">
                        <VideoLogo className="h-full" />
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 mt-6">
                {/* No-session banner — ask waiter to open table */}
                {!isValidSession && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                        <p className="text-amber-800 font-semibold">👋 Welcome!</p>
                        <p className="text-amber-700 text-sm mt-1">
                            Please ask your waiter to open a session for this table so you can place orders.
                        </p>
                    </div>
                )}

                <MenuSection
                    categories={categories}
                    items={menuItems}
                    sessionId={sessionToken}
                    restaurantSlug={tableData.qr_token}
                    restaurantId={tableData.restaurant_id}
                />
            </main>

            {/* Service Requests — gated by features_v2 flag */}
            {isValidSession && sessionUUID && serviceRequestsEnabled && (
                <ServiceRequestPanel
                    sessionId={sessionUUID}
                    restaurantId={tableData.restaurant_id}
                />
            )}

            {/* Persistent Bottom Cart Summary */}
            <CartSummary sessionId={sessionToken} tableSlug={tableData.qr_token} />
        </div>
    )

    return (
        <HomepageGate
            restaurantId={tableData.restaurant_id}
            onProceed={() => setShowMenu(true)}
        >
            {showMenu && menuContent}
        </HomepageGate>
    )
}
