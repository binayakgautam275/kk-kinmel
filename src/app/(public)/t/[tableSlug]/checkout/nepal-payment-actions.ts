'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { validateInput } from '@/lib/validation'
import { checkRateLimit, RATE_LIMIT_RULES } from '@/lib/ratelimit'
import { z } from 'zod'

const PaymentClaimInputSchema = z.object({
    restaurantId: z.string().uuid('Invalid restaurant ID'),
    amount: z.number().positive('Amount must be positive').max(999999, 'Amount too large'),
    paymentMethod: z.enum(['qr_scan', 'esewa', 'khalti', 'fonepay', 'cash']),
    phone: z.string().regex(/^\+?[\d\s\-()]{7,}$/, 'Invalid phone format').optional(),
    screenshot: z.instanceof(File).optional(),
    orderId: z.string().uuid().nullable().optional()
})

export async function submitPaymentClaim(formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const restaurantId = formData.get('restaurantId') as string
    const amount = parseFloat(formData.get('amount') as string)
    const paymentMethod = formData.get('paymentMethod') as string
    const phone = (formData.get('phone') as string) || undefined
    const screenshot = formData.get('screenshot') as File | null
    const orderId = formData.get('orderId') as string | null

    // Rate limit: 3 payment claims per 5 minutes per IP
    const rateLimitError = await checkRateLimit(
        'PAYMENT_CLAIM',
        RATE_LIMIT_RULES.PAYMENT_CLAIM.requests,
        RATE_LIMIT_RULES.PAYMENT_CLAIM.windowSeconds
    )
    if (rateLimitError) return { error: 'Too many payment attempts. Please wait a few minutes.' }

    const validation = validateInput(PaymentClaimInputSchema, {
        restaurantId,
        amount,
        paymentMethod,
        phone: phone && phone.trim().length > 0 ? phone : undefined,
        screenshot: screenshot && screenshot.size > 0 ? screenshot : undefined,
        orderId
    })

    if (!validation.success) {
        console.warn('Payment validation failed:', validation.error)
        return { error: `Invalid payment claim: ${validation.error}` }
    }

    const { restaurantId: validRestaurantId, amount: validAmount, paymentMethod: validMethod, phone: validPhone, screenshot: validScreenshot, orderId: validOrderId } = validation.data!

    const supabase = await createAdminClient()

    // Validate claimed amount against the actual order total (prevent under-payment fraud)
    if (validOrderId) {
        const { data: order } = await supabase
            .from('orders')
            .select('total_amount, restaurant_id')
            .eq('id', validOrderId)
            .single()

        if (!order) return { error: 'Order not found.' }

        // Ensure the order belongs to the claimed restaurant (cross-tenant guard)
        if (order.restaurant_id !== validRestaurantId) return { error: 'Invalid request.' }

        // Allow ±1 rupee tolerance for rounding differences
        const diff = Math.abs(validAmount - order.total_amount)
        if (diff > 1) {
            return { error: `Payment amount (Rs. ${validAmount.toFixed(2)}) does not match order total (Rs. ${order.total_amount.toFixed(2)}). Please re-enter the correct amount.` }
        }
    }

    let screenshotUrl: string | null = null

    if (validScreenshot && validScreenshot.size > 0) {
        const ext = validScreenshot.name.split('.').pop()
        // Payment proofs go to a PRIVATE bucket. We store the storage path (not a
        // public URL) in screenshot_url; /api/payment-proof signs a short-lived URL
        // on demand after auth + tenant checks. This keeps proofs unreachable via a
        // raw public URL even if the path leaks.
        const filePath = `${validRestaurantId}/${Date.now()}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(filePath, validScreenshot, {
                contentType: validScreenshot.type,
                upsert: false,
            })

        if (uploadError) {
            console.error('Screenshot upload failed:', uploadError)
            // Continue without screenshot — it's optional
        } else if (uploadData) {
            screenshotUrl = filePath
        }
    }

    const { error } = await supabase
        .from('payment_verifications')
        .insert({
            restaurant_id: validRestaurantId,
            order_id: validOrderId || null,
            amount: validAmount,
            payment_method: validMethod,
            reference_code: validPhone || null,
            screenshot_url: screenshotUrl,
        })

    if (error) {
        console.error('Payment claim insert failed:', error)
        return { error: `Failed to submit payment claim. Please try again. Details: ${error.message}` }
    }

    return { success: true }
}
