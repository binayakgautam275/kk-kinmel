'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import HomepageGate from '@/components/customer/HomepageGate'
import type { MenuItem, MenuCategory } from '@/types/database'
import MenuSection from '@/components/customer/MenuSection'
import CartSummary from '@/components/customer/CartSummary'
import ServiceRequestPanel from '@/components/customer/ServiceRequestPanel'
import VideoLogo from '@/components/shared/VideoLogo'
import PhysicalMenuGallery from '@/components/customer/PhysicalMenuGallery'
import { TranslationProvider } from '@/lib/contexts/TranslationContext'
import LanguageSwitcher from '@/components/customer/LanguageSwitcher'
import { UtensilsCrossed, RefreshCw, Bell, Check, Loader2, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
    const supabaseRef = useRef(createClient())

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

    // Direct DB fetch for the active session on this table (used by both the
    // one-shot Realtime race-guard and the 3-second polling fallback).
    const fetchActiveSession = async () => {
        const { data } = await supabaseRef.current
            .from('sessions')
            .select('id, session_token')
            .eq('table_id', tableData.id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (data?.session_token) {
            applySession(data.session_token, data.id)
            return true
        }
        return false
    }

    // Polling fallback — runs every 3 s when no session is detected.
    // This catches the case where Supabase Realtime fails to deliver the INSERT
    // event (WebSocket not yet established, publication lag, etc.).
    useEffect(() => {
        if (hasSession) return
        // Immediate check first, then poll
        fetchActiveSession()
        const timer = setInterval(fetchActiveSession, 3000)
        return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableData.id, hasSession])

    // Subscribe to session INSERT events for this table so the customer page
    // enables ordering the moment a waiter opens a session — no refresh needed.
    //
    // Race guard: subscribe() callback fires once the WebSocket handshake
    // completes. At that point we do a one-shot DB fetch to catch any session
    // opened in the gap between SSR render and WebSocket ready.
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
                    const s = payload.new as { status: string; session_token: string; id: string; expires_at: string }
                    if (s.status === 'active' && s.session_token && new Date(s.expires_at) > new Date()) {
                        applySession(s.session_token, s.id)
                    }
                }
            )
            .subscribe(async (status) => {
                if (status !== 'SUBSCRIBED') return
                // Catch sessions opened between SSR and WebSocket ready
                await fetchActiveSession()
            })
        return () => { supabase.removeChannel(channel) }
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
