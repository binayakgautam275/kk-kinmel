import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getRestaurantFeatures } from '@/lib/features'
import type { MenuItem } from '@/types/database'
import TablePageClient from './TablePageClient'

export const revalidate = 60 // ISR: Revalidate at most every 60 seconds

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
    const [{ data: categories }, { data: rawMenuItems }, features] = await Promise.all([
        supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_visible', true)
            .order('sort_order', { ascending: true }),

        supabase
            .from('menu_items')
            .select('*, menu_item_modifier_groups(*, menu_item_modifiers(*))')
            .eq('restaurant_id', restaurantId)
            .eq('is_available', true),

        getRestaurantFeatures(restaurantId),
    ])

    // Normalize DB field names → client-side field names
    // menu_item_modifier_groups → modifier_groups, menu_item_modifiers → modifiers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const menuItems = (rawMenuItems || []).map((item: Record<string, any>) => ({
        ...item,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modifier_groups: (item.menu_item_modifier_groups || []).map((g: Record<string, any>) => ({
            ...g,
            modifiers: g.menu_item_modifiers || [],
        })),
    })) as MenuItem[]

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
        />
    )
}
