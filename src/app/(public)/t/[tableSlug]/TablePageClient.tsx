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
    const [isDismissed, setIsDismissed] = useState(false)

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
        <div className="relative min-h-screen bg-gray-50 pb-28">
            {/* The main page content that gets blurred */}
            <div className={`transition-all duration-300 ${!hasSession && !isDismissed ? 'filter blur-md pointer-events-none select-none' : ''}`}>
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

            {/* Sticky banner when dismissed */}
            {!hasSession && isDismissed && (
                <div className="fixed top-14 inset-x-0 z-30 bg-[#FFF0E6] border-b border-[#EDD9C8] py-2.5 px-4 flex items-center justify-between gap-3 max-w-2xl mx-auto shadow-sm animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2">
                        <RefreshCw size={12} className="animate-spin text-[#E85D04] shrink-0" />
                        <span className="text-xs font-semibold text-[#8C6A50]">
                            Waiting for session on Table {tableData.label}…
                        </span>
                    </div>
                    <button
                        onClick={() => setIsDismissed(false)}
                        className="text-xs bg-[#E85D04] hover:bg-[#d05303] text-white font-black px-3 py-1.5 rounded-lg active:scale-95 transition shrink-0 shadow-sm"
                    >
                        View Status
                    </button>
                </div>
            )}

            {/* The Popup Modal */}
            {!hasSession && !isDismissed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1006]/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white p-6 rounded-3xl max-w-sm w-full border border-[#EDD9C8] shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-300">
                        {logoUrl ? (
                            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white border border-[#EDD9C8] mb-4 shadow-sm">
                                <Image src={logoUrl} alt={restaurantName} fill className="object-cover" sizes="64px" />
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-[#FFF0E6] flex items-center justify-center mb-4 border border-[#EDD9C8] shadow-sm">
                                <UtensilsCrossed size={28} className="text-[#E85D04]" />
                            </div>
                        )}
                        <h2 className="font-black text-[#1A1006] text-lg mb-2">Welcome to {restaurantName}!</h2>
                        <p className="text-xs font-semibold text-[#E85D04] bg-[#FFF0E6] px-2.5 py-1 rounded-full mt-0.5 mb-3">
                            Table {tableData.label}
                        </p>
                        <p className="text-[#8C6A50] text-sm font-semibold mb-6 leading-relaxed">
                            Your waiter will open a session for Table {tableData.label} so you can place orders.
                        </p>
                        {requestSent ? (
                            <div className="w-full bg-[#EBFDF2] border border-[#BFF3D4] rounded-2xl py-3 px-4 flex flex-col items-center justify-center gap-1.5 animate-scale-in">
                                <span className="text-xl">🔔</span>
                                <p className="text-green-600 text-xs font-black flex items-center gap-1">
                                    <Check size={14} className="stroke-[3px]" /> Waiter Notified!
                                </p>
                                <p className="text-green-600/70 text-[10px] font-bold">They'll be right with you.</p>
                            </div>
                        ) : (
                            <div className="w-full space-y-4">
                                <button
                                    onClick={async () => {
                                        setRequestLoading(true)
                                        const res = await requestSessionOpen(tableData.id, tableData.restaurant_id)
                                        setRequestLoading(false)
                                        if (res.success || res.error?.includes('already')) setRequestSent(true)
                                    }}
                                    disabled={requestLoading}
                                    className="w-full flex items-center justify-center gap-2 text-sm font-black bg-[#E85D04] text-white py-3.5 rounded-2xl active:scale-95 transition disabled:opacity-60 shadow-md shadow-[#E85D04]/15"
                                >
                                    {requestLoading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                                    Ring for Service
                                </button>
                                <p className="text-[#C4A882] text-[11px] font-bold flex items-center justify-center gap-1">
                                    <RefreshCw size={10} className="animate-spin text-[#E85D04]" />
                                    Waiting for session to open...
                                </p>
                            </div>
                        )}
                        <div className="pt-4 border-t border-gray-100 w-full mt-4">
                            <button
                                onClick={() => setIsDismissed(true)}
                                className="text-xs text-[#8C6A50] hover:text-[#1A1006] font-bold underline decoration-dotted"
                            >
                                Browse Menu (View Only)
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
