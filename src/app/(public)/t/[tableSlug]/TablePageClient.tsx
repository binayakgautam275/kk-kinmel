'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import HomepageGate from '@/components/customer/HomepageGate'
import type { MenuItem, MenuCategory } from '@/types/database'
import MenuSection from '@/components/customer/MenuSection'
import CartSummary from '@/components/customer/CartSummary'
import ServiceRequestPanel from '@/components/customer/ServiceRequestPanel'
import VideoLogo from '@/components/shared/VideoLogo'
import { TranslationProvider } from '@/lib/contexts/TranslationContext'
import LanguageSwitcher from '@/components/customer/LanguageSwitcher'
import { UtensilsCrossed, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
    multiLanguageEnabled: boolean
    translations: { language_code: string; entity_type: string; entity_id: string; translated_text: string }[]
    supportedLanguages: { code: string; name: string }[]
}

export default function TablePageClient({
    tableData,
    categories,
    menuItems,
    sessionToken,
    sessionUUID,
    isValidSession,
    serviceRequestsEnabled,
    multiLanguageEnabled,
    translations,
    supportedLanguages,
}: TablePageClientProps) {
    // Live session state — updated by Supabase realtime if a waiter opens a session
    const [liveSessionToken, setLiveSessionToken] = useState(sessionToken)
    const [liveSessionUUID, setLiveSessionUUID] = useState(sessionUUID)
    const hasSession = !!liveSessionToken

    // Always start with menu visible — HomepageGate renders its own homepage layer
    // on top; onProceed just ensures children are ready once that layer dismisses.
    const [showMenu, setShowMenu] = useState(true)
    const supabaseRef = useRef(createClient())

    // Subscribe to session INSERT events for this table so the customer page
    // enables ordering the moment a waiter opens a session — no refresh needed
    useEffect(() => {
        if (hasSession) return
        const supabase = supabaseRef.current
        const channel = supabase
            .channel(`table-session-watch-${tableData.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'sessions',
                    filter: `table_id=eq.${tableData.id}`,
                },
                (payload) => {
                    const s = payload.new as { status: string; session_token: string; id: string }
                    if (s.status === 'active' && s.session_token) {
                        setLiveSessionToken(s.session_token)
                        setLiveSessionUUID(s.id)
                    }
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [tableData.id, hasSession])

    const restaurantName = tableData.restaurants?.name || 'Restaurant'
    const logoUrl = tableData.restaurants?.logo_url

    const menuContent = (
        <div className="min-h-screen bg-gray-50 pb-28">
            {/* Sticky header — compact, restaurant-branded */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    {/* Restaurant identity */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        {logoUrl ? (
                            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0">
                                <Image src={logoUrl} alt={restaurantName} fill className="object-cover" sizes="32px" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                                <UtensilsCrossed size={15} className="text-[var(--color-primary)]" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--color-secondary)] leading-none truncate">{restaurantName}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Table {tableData.label}
                                {!hasSession && <span className="ml-1 text-amber-500 font-medium">· View only</span>}
                            </p>
                        </div>
                    </div>

                    {/* Right side: language switcher + platform logo */}
                    <div className="flex items-center gap-2 shrink-0">
                        {multiLanguageEnabled && <LanguageSwitcher />}
                        <VideoLogo className="h-6 opacity-60" />
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-4">
                {/* No-session notice — disappears automatically when waiter opens session */}
                {!hasSession && (
                    <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5">👋</span>
                            <div className="flex-1">
                                <p className="font-semibold text-amber-900 text-sm">Welcome to {restaurantName}!</p>
                                <p className="text-amber-700 text-sm mt-0.5">
                                    Ask your waiter to open a session for Table {tableData.label} so you can place orders.
                                </p>
                                <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
                                    <RefreshCw size={11} className="animate-spin" />
                                    Waiting for your session to open…
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <MenuSection
                    categories={categories}
                    items={menuItems}
                    sessionId={liveSessionToken}
                    restaurantSlug={tableData.qr_token}
                    restaurantId={tableData.restaurant_id}
                />
            </main>

            {/* Service request FAB — only when session active */}
            {hasSession && liveSessionUUID && serviceRequestsEnabled && (
                <ServiceRequestPanel
                    sessionId={liveSessionUUID}
                    restaurantId={tableData.restaurant_id}
                />
            )}

            {/* Sticky cart bar */}
            <CartSummary sessionId={liveSessionToken} tableSlug={tableData.qr_token} />
        </div>
    )

    return (
        <TranslationProvider
            translations={translations}
            supportedLanguages={supportedLanguages}
            restaurantId={tableData.restaurant_id}
        >
            <HomepageGate
                restaurantId={tableData.restaurant_id}
                onProceed={() => setShowMenu(true)}
            >
                {showMenu && menuContent}
            </HomepageGate>
        </TranslationProvider>
    )
}
