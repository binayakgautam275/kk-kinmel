import { NextRequest, NextResponse } from 'next/server'
import { verifyClientIp } from '@/lib/ip-check'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const role = searchParams.get('role') || undefined

    if (!restaurantId) {
        return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })
    }

    try {
        const { allowed, clientIp } = await verifyClientIp(restaurantId, role)
        return NextResponse.json({ allowed, clientIp })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
