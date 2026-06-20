/**
 * GET /api/session/active?table_id=<uuid>&qr_token=<token>
 *
 * Returns the active session for a table — but only to a caller that presents the
 * table's qr_token (proof they scanned that table's QR code). This replaces the old
 * global anon SELECT policy on `sessions`, which let anyone enumerate every active
 * session_token (a customer bearer credential) across all restaurants.
 *
 * The lookup is scoped to a single table and gated on the qr_token, so a caller can
 * only ever learn the token for the table they physically have access to.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const tableId = request.nextUrl.searchParams.get('table_id')
    const qrToken = request.nextUrl.searchParams.get('qr_token')

    if (!tableId || !qrToken) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Gate: the qr_token must belong to this table before we reveal any session token.
    const { data: table } = await supabase
        .from('tables')
        .select('id')
        .eq('id', tableId)
        .eq('qr_token', qrToken)
        .maybeSingle()

    if (!table) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: session } = await supabase
        .from('sessions')
        .select('id, session_token')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return NextResponse.json({ session: session ?? null })
}
