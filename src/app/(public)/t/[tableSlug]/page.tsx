import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getRestaurantFeatures } from '@/lib/features'
import { getCachedMenuData } from '@/lib/menu-cache'
import type { MenuItem } from '@/types/database'
import TablePageClient from './TablePageClient'

import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
    params: Promise<{ tableSlug: string }>
}): Promise<Metadata> {
    const params = await props.params;
    const supabase = await createAdminClient()
    const { data: tableData } = await supabase
        .from('tables')
        .select('restaurant_id')
        .eq('qr_token', params.tableSlug)
        .single()

    if (tableData?.restaurant_id) {
        return {
            manifest: `/api/manifest/${tableData.restaurant_id}?start_url=${encodeURIComponent(`/t/${params.tableSlug}`)}`
        }
    }
    return {}
}

export default async function CustomerMenuPage(props: {
    params: Promise<{ tableSlug: string }>
    searchParams: Promise<{ s?: string }>
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    // 1. Session & Table Validation
    const tableToken = params.tableSlug
    let sessionToken = searchParams.s

    const supabase = await createAdminClient()

    // Find the table and restaurant ID
    const { data: tableData } = await supabase
        .from('tables')
        .select('id, restaurant_id, label, restaurants(name, logo_url)')
        .eq('qr_token', tableToken)
        .single()

    if (!tableData) return notFound()

    const restaurantId = tableData.restaurant_id

    // Track the session UUID (needed for FK references like service_requests.session_id)
    let sessionUUID: string | undefined

    // Find active session for this table (opened by waiter)
    if (!sessionToken) {
        const { data: existingSession } = await supabase
            .from('sessions')
            .select('id, session_token')
            .eq('table_id', tableData.id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existingSession) {
            sessionToken = existingSession.session_token
            sessionUUID = existingSession.id
        }
        // If no active session, customer sees menu in view-only mode
        // They need to ask the waiter to open a session for their table
    } else {
        // Validate the provided session token is still active
        const { data: validSession } = await supabase
            .from('sessions')
            .select('id, session_token')
            .eq('session_token', sessionToken)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

        if (!validSession) {
            sessionToken = undefined // Session expired or invalid
        } else {
            sessionUUID = validSession.id
        }
    }

    const isValidSession = !!sessionToken

    // 2. Fetch Menu Data + Feature Flags in parallel
    const [
        features,
        menuData
    ] = await Promise.all([
        getRestaurantFeatures(restaurantId),
        getCachedMenuData(restaurantId)
    ])

    const { categories, menuItems, translations, supportedLanguages } = menuData

    // Always include English as first option if there are other languages
    const langs = supportedLanguages.length > 0
        ? [{ code: 'en', name: 'EN' }, ...supportedLanguages]
        : []

    return (
        <TablePageClient
            tableData={{
                id: tableData.id,
                label: tableData.label,
                qr_token: tableToken,
                restaurant_id: tableData.restaurant_id,
                restaurants: Array.isArray(tableData.restaurants)
                    ? tableData.restaurants[0] || null
                    : (tableData.restaurants as unknown as { name: string; logo_url: string | null } | null),
            }}
            categories={categories || []}
            menuItems={menuItems}
            sessionToken={sessionToken}
            sessionUUID={sessionUUID}
            isValidSession={isValidSession}
            serviceRequestsEnabled={features?.serviceRequestsEnabled !== false}
            multiLanguageEnabled={features?.multiLanguageEnabled === true}
            translations={translations}
            supportedLanguages={langs}
        />
    )
}
