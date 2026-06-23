import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

/**
 * Fetch allowed_ips for a restaurant.
 * Cached for 30 seconds across requests, tags added for instant revalidation.
 */
export const getRestaurantAllowedIps = (restaurantId: string) => unstable_cache(
    async (): Promise<string | null> => {
        const supabase = await createAdminClient()
        const { data } = await supabase
            .from('restaurants')
            .select('allowed_ips')
            .eq('id', restaurantId)
            .single()
        return data?.allowed_ips ?? null
    },
    [`restaurant-allowed-ips-${restaurantId}`],
    { revalidate: 30, tags: [`restaurant-allowed-ips-${restaurantId}`] }
)()

/**
 * Parse headers to extract client public IP.
 * Handles port stripping, IPv6-mapped IPv4 addresses (::ffff:), and maps ::1 to 127.0.0.1.
 */
export function getClientIp(reqHeaders: Headers): string {
    const rawIp = (
        reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() ||
        reqHeaders.get('x-real-ip') ||
        reqHeaders.get('cf-connecting-ip') ||
        '127.0.0.1'
    )
    
    let ip = rawIp.trim()
    
    // Strip port if present
    if (ip.includes(':') && !ip.includes('.')) {
        // IPv6 address with port (e.g. [2001:db8::1]:80)
        if (ip.startsWith('[') && ip.includes(']:')) {
            ip = ip.substring(1, ip.indexOf(']:'))
        }
    } else if (ip.includes(':')) {
        // IPv4 address with port (e.g. 192.168.1.1:3000 or ::ffff:192.168.1.1:3000)
        const lastColon = ip.lastIndexOf(':')
        const possiblePort = ip.substring(lastColon + 1)
        if (/^\d+$/.test(possiblePort)) {
            ip = ip.substring(0, lastColon)
        }
    }

    // Strip IPv6-mapped IPv4 prefix (::ffff:)
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7)
    }

    // Map IPv6 localhost to IPv4 localhost for testing parity
    if (ip === '::1') {
        ip = '127.0.0.1'
    }

    return ip
}

/**
 * Verify if client IP matches restaurant allowed IPs.
 * Excludes manager and super_admin roles.
 */
export async function verifyClientIp(
    restaurantId: string,
    role?: string
): Promise<{ allowed: boolean; clientIp: string; allowedIps: string | null }> {
    // 1. Managers and Super Admins can access from anywhere
    if (role === 'manager' || role === 'super_admin') {
        return { allowed: true, clientIp: '', allowedIps: null }
    }

    // 2. Fetch configured allowed IPs
    const allowedIpsStr = await getRestaurantAllowedIps(restaurantId)
    if (!allowedIpsStr || allowedIpsStr.trim() === '') {
        // No IP restrictions set by manager, access allowed
        return { allowed: true, clientIp: '', allowedIps: null }
    }

    // 3. Extract client IP from request headers
    const reqHeaders = await headers()
    const clientIp = getClientIp(reqHeaders)

    // 4. Split and check matching IP (with normalization)
    const allowedList = allowedIpsStr
        .split(',')
        .map(ip => {
            let clean = ip.trim()
            if (clean.startsWith('::ffff:')) {
                clean = clean.substring(7)
            }
            if (clean === '::1') {
                clean = '127.0.0.1'
            }
            return clean
        })
        .filter(ip => ip.length > 0)

    const allowed = allowedList.includes(clientIp)

    return { allowed, clientIp, allowedIps: allowedIpsStr }
}
