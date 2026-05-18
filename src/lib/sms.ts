/**
 * Sparrow SMS integration (Nepal)
 * Docs: https://sparrowsms.com/api-documentation
 * Env vars required: SPARROW_SMS_TOKEN, SPARROW_SMS_FROM
 */

const SPARROW_API = 'https://api.sparrowsms.com/v2/sms/'

type SmsResult = { success: true } | { success: false; error: string }

async function sendSms(to: string, text: string): Promise<SmsResult> {
    const token = process.env.SPARROW_SMS_TOKEN
    const from  = process.env.SPARROW_SMS_FROM || 'TheHouse'

    if (!token) {
        console.warn('[SMS] SPARROW_SMS_TOKEN not set — skipping SMS')
        return { success: false, error: 'SMS not configured' }
    }

    // Normalize Nepal phone numbers to 10 digits
    const normalized = to.replace(/\D/g, '').replace(/^977/, '')
    if (normalized.length !== 10) {
        return { success: false, error: `Invalid phone number: ${to}` }
    }

    try {
        const res = await fetch(SPARROW_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                from,
                to: normalized,
                text: text.slice(0, 160), // single SMS segment limit
            }),
        })

        const body = await res.json().catch(() => ({}))

        if (!res.ok || body.response_code !== 200) {
            console.error('[SMS] Send failed:', body)
            return { success: false, error: body.message ?? `HTTP ${res.status}` }
        }

        return { success: true }
    } catch (err) {
        console.error('[SMS] Network error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/** Notify customer their order was received and is being prepared. */
export async function sendOrderConfirmationSms(
    phone: string,
    orderId: string,
    restaurantName: string
): Promise<SmsResult> {
    const shortId = orderId.substring(0, 8).toUpperCase()
    return sendSms(
        phone,
        `${restaurantName}: Your order #${shortId} has been received and is being prepared. Thank you!`
    )
}

/** Notify customer their order is ready for pickup / delivery. */
export async function sendOrderReadySms(
    phone: string,
    orderId: string,
    restaurantName: string
): Promise<SmsResult> {
    const shortId = orderId.substring(0, 8).toUpperCase()
    return sendSms(
        phone,
        `${restaurantName}: Order #${shortId} is ready! Your waiter will bring it to your table shortly.`
    )
}

/** Notify loyalty member they earned points. */
export async function sendLoyaltyPointsSms(
    phone: string,
    pointsEarned: number,
    pointsBalance: number,
    restaurantName: string
): Promise<SmsResult> {
    return sendSms(
        phone,
        `${restaurantName}: You earned ${pointsEarned} loyalty points! Balance: ${pointsBalance} pts. Thank you for dining with us.`
    )
}
