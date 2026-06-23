import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getClientIp } from '@/lib/ip-check'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Returns the caller's own public IP — used by the Settings "Add my current IP"
// button. (verify-ip can't be reused: it returns '' for managers/super_admins.)
export async function GET() {
    try {
        await getCurrentUser() // authenticated staff only
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const ip = getClientIp(await headers())
    return NextResponse.json({ ip })
}
