'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import HomepageGate from '@/components/customer/HomepageGate'
import type { MenuItem, MenuCategory } from '@/types/database'
import MenuSection from '@/components/customer/MenuSection'
import CartSummary from '@/components/customer/CartSummary'
import ServiceRequestPanel from '@/components/customer/ServiceRequestPanel'
import Logo from '@/components/shared/Logo'
import PhysicalMenuGallery from '@/components/customer/PhysicalMenuGallery'
import { TranslationProvider } from '@/lib/contexts/TranslationContext'
import LanguageSwitcher from '@/components/customer/LanguageSwitcher'
import { UtensilsCrossed, RefreshCw, Bell, Check, Loader2, Home } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart'
import { requestSessionOpen } from '@/app/api/service-requests/actions'

interface TablePageClientProps {
    tableData: {
        id: string
        label: string
        qr_token: string
        restaurant_id: string
        restaurants: { name: string; logo_url: string | null; physical_menu_urls: string[] | null } | null
    }
    categories: MenuCategory[]
    menuItems: MenuItem[]
    comboItems: any[]
    sessionToken: string | undefined
    sessionUUID: string | undefined
    isValidSession: boolean
    serviceRequestsEnabled: boolean
    multiLanguageEnabled: boolean
    menuLayout?: 'grid' | 'list'
    translations: { language_code: string; entity_type: string; entity_id: string; translated_text: string }[]
    supportedLanguages: { code: string; name: string }[]
}

export default function TablePageClient({
    tableData,
    categories,
    menuItems,
    comboItems,
    sessionToken,
    sessionUUID,
    isValidSession,
    serviceRequestsEnabled,
    multiLanguageEnabled,
    menuLayout = 'grid',
    translations,
    supportedLanguages,
}: TablePageClientProps) {
    // Live session state — updated by Supabase realtime if a waiter opens a session
    const [liveSessionToken, setLiveSessionToken] = useState(sessionToken)
    const [liveSessionUUID, setLiveSessionUUID] = useState(sessionUUID)
    const hasSession = !!liveSessionToken

    const [showMenu, setShowMenu] = useState(true)
    const [requestSent, setRequestSent] = useState(false)
    const [requestLoading, setRequestLoading] = useState(false)

    // Keep the Zustand cart store in sync with the live session so checkout
    // always sees a non-null sessionId regardless of how the session arrived
    // (SSR prop vs Realtime INSERT vs race-condition one-shot fetch).
    useEffect(() => {
        if (liveSessionToken) {
            useCartStore.getState().setSession(
                liveSessionToken,
                tableData.qr_token,
                tableData.restaurant_id,
            )
        }
    }, [liveSessionToken, tableData.qr_token, tableData.restaurant_id])

    // Helper — shared by Realtime handler, one-shot fetch, and polling
    const applySession = (token: string, uuid: string) => {
        setLiveSessionToken(token)
        setLiveSessionUUID(uuid)
    }

    // Fetch the active session for this table via a qr_token-gated server endpoint.
    // Customers can no longer read `sessions` directly (that policy exposed every
    // session_token globally) — the endpoint only returns this table's session and
    // requires the table's qr_token as proof of access.
    const fetchActiveSession = async () => {
        try {
            const res = await fetch(
                `/api/session/active?table_id=${encodeURIComponent(tableData.id)}&qr_token=${encodeURIComponent(tableData.qr_token)}`,
                { cache: 'no-store' },
            )
            if (!res.ok) return false
            const { session } = await res.json()
            if (session?.session_token) {
                applySession(session.session_token, session.id)
                return true
            }
        } catch {
            // Transient network error — the polling interval will retry.
        }
        return false
    }

    // Polling — runs every 3 s while no session is detected, so the page enables
    // ordering within ~3 s of a waiter opening a session (no refresh needed). This
    // replaces the former anon Realtime subscription on `sessions`, which required
    // the global read policy we removed for security.
    useEffect(() => {
        if (hasSession) return
        // Immediate check first, then poll
        fetchActiveSession()
        const timer = setInterval(fetchActiveSession, 3000)
        return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableData.id, hasSession])

    const restaurantName = tableData.restaurants?.name || 'Restaurant'
    const logoUrl = tableData.restaurants?.logo_url

    const menuContent = (onBackToHome: (() => void) | null) => (
        <div className="min-h-screen bg-gray-50 pb-28">
            {/* Sticky header — compact, restaurant-branded */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    {/* Restaurant identity */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        {onBackToHome && (
                            <button
                                onClick={onBackToHome}
                                aria-label="Back to homepage"
                                title="Back to homepage"
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition active:scale-95"
                            >
                                <Home size={16} className="text-[var(--color-secondary)]" />
                            </button>
                        )}
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
                        <Logo className="h-6 opacity-60" />
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
                                    Your waiter will open a session for Table {tableData.label} so you can place orders.
                                </p>
                                {requestSent ? (
                                    <p className="text-emerald-600 text-xs mt-3 flex items-center gap-1.5 font-medium">
                                        <Check size={13} />
                                        Waiter notified! They&apos;ll be right with you.
                                    </p>
                                ) : (
                                    <div className="flex items-center justify-between mt-3">
                                        <p className="text-amber-600 text-xs flex items-center gap-1">
                                            <RefreshCw size={11} className="animate-spin" />
                                            Waiting for session…
                                        </p>
                                        <button
                                            onClick={async () => {
                                                setRequestLoading(true)
                                                const res = await requestSessionOpen(tableData.id, tableData.restaurant_id)
                                                setRequestLoading(false)
                                                if (res.success || res.error?.includes('already')) setRequestSent(true)
                                            }}
                                            disabled={requestLoading}
                                            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-lg active:scale-95 transition disabled:opacity-60"
                                        >
                                            {requestLoading ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                                            Ring for Service
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <PhysicalMenuGallery 
                    images={tableData.restaurants?.physical_menu_urls || []} 
                    restaurantName={restaurantName} 
                />

                <MenuSection
                    categories={categories}
                    items={menuItems}
                    comboItems={comboItems}
                    sessionId={liveSessionToken}
                    restaurantSlug={tableData.qr_token}
                    restaurantId={tableData.restaurant_id}
                    layout={menuLayout}
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
                {({ backToHome }) => showMenu && menuContent(backToHome)}
            </HomepageGate>
        </TranslationProvider>
    )
}
