'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { validateInput } from '@/lib/validation'
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

    let screenshotUrl: string | null = null

    if (validScreenshot && validScreenshot.size > 0) {
        const ext = validScreenshot.name.split('.').pop()
        const fileName = `payment-proofs/${validRestaurantId}/${Date.now()}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(fileName, validScreenshot, {
                contentType: validScreenshot.type,
                upsert: false,
            })

        if (uploadError) {
            console.error('Screenshot upload failed:', uploadError)
            // Continue without screenshot — it's optional
        } else if (uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName)
            screenshotUrl = publicUrl
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
        return { error: 'Failed to submit payment claim. Please try again.' }
    }

    return { success: true }
}
