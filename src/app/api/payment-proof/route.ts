/**
 * GET /api/payment-proof?claim=<claimId>
 *
 * Auth-gated proxy for payment proof screenshots.
 * Returns a short-lived signed URL so the underlying storage path is never
 * exposed directly to the browser.
 *
 * ⚠️  IMPORTANT — infrastructure step required for full security:
 *     Move the 'payment-proofs/' prefix to a PRIVATE Supabase storage bucket.
 *     Until then, the public URL still exists; this proxy adds an auth gate
 *     in front of it and is upgrade-ready when the bucket is made private.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

// Signed URL valid for 30 minutes
const SIGNED_URL_EXPIRY = 30 * 60

export async function GET(request: NextRequest) {
    // Only staff roles may view payment proofs
    let currentUser
    try {
        currentUser = await requireRole('super_admin', 'manager', 'waiter')
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const claimId = request.nextUrl.searchParams.get('claim')
    if (!claimId || !/^[0-9a-f-]{36}$/.test(claimId)) {
        return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Fetch the claim to get the screenshot URL
    const { data: claim } = await supabase
        .from('payment_verifications')
        .select('screenshot_url, restaurant_id')
        .eq('id', claimId)
        .single()

    if (!claim?.screenshot_url) {
        return NextResponse.json({ error: 'No screenshot found' }, { status: 404 })
    }

    // Tenant isolation: createAdminClient() bypasses RLS, so the claim's
    // restaurant must be verified against the caller's. Return 404 (not 403)
    // to avoid leaking the existence of other tenants' payment proofs.
    if (claim.restaurant_id !== currentUser.restaurantId) {
        return NextResponse.json({ error: 'No screenshot found' }, { status: 404 })
    }

    // Extract the storage path from the public URL
    // Public URL format: https://<project>.supabase.co/storage/v1/object/public/uploads/<path>
    const url = new URL(claim.screenshot_url)
    const pathMatch = url.pathname.match(/\/object\/public\/uploads\/(.+)$/)
    if (!pathMatch) {
        // Fallback: redirect to the original URL if we can't parse the path
        return NextResponse.redirect(claim.screenshot_url)
    }

    const storagePath = decodeURIComponent(pathMatch[1])

    // Generate a short-lived signed URL
    const { data: signed, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

    if (error || !signed?.signedUrl) {
        // If signed URL fails (e.g. public bucket), fall back to original
        return NextResponse.redirect(claim.screenshot_url)
    }

    return NextResponse.redirect(signed.signedUrl)
}
