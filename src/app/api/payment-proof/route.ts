/**
 * GET /api/payment-proof?claim=<claimId>
 *
 * Auth-gated proxy for payment proof screenshots.
 * Returns a short-lived signed URL so the underlying storage path is never
 * exposed directly to the browser.
 *
 * New uploads land in the PRIVATE `payment-proofs` bucket, so a raw public URL
 * no longer exists — access requires passing the auth + tenant checks below.
 * Legacy records (full public `uploads` URLs) remain supported for back-compat.
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

    // New uploads store a bare storage path in the PRIVATE `payment-proofs` bucket.
    // Legacy records store a full public URL in the `uploads` bucket — handle both.
    let bucket: string
    let storagePath: string

    if (/^https?:\/\//i.test(claim.screenshot_url)) {
        // Legacy: https://<project>.supabase.co/storage/v1/object/public/uploads/<path>
        const url = new URL(claim.screenshot_url)
        const pathMatch = url.pathname.match(/\/object\/public\/uploads\/(.+)$/)
        if (!pathMatch) {
            return NextResponse.redirect(claim.screenshot_url)
        }
        bucket = 'uploads'
        storagePath = decodeURIComponent(pathMatch[1])
    } else {
        bucket = 'payment-proofs'
        storagePath = claim.screenshot_url
    }

    // Generate a short-lived signed URL
    const { data: signed, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

    if (error || !signed?.signedUrl) {
        return NextResponse.json({ error: 'No screenshot found' }, { status: 404 })
    }

    return NextResponse.redirect(signed.signedUrl)
}
