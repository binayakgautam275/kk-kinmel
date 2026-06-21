import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { generateEodReport } from '@/lib/reports'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    // Fetch all active, non-suspended restaurants
    const { data: restaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('is_active', true)
        .eq('is_suspended', false)

    if (fetchError) {
        console.error('[cron/generate-eod-reports] fetch error:', fetchError)
        return Response.json({ error: fetchError.message }, { status: 500 })
    }

    if (!restaurants || restaurants.length === 0) {
        return Response.json({ message: 'No active restaurants', generated: 0 })
    }

    // Yesterday in NST (UTC+5:45) — subtract 15min to land safely in "yesterday NST"
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const reportDate = yesterday.toISOString().slice(0, 10) // YYYY-MM-DD
    const results = await Promise.allSettled(
        restaurants.map(async (restaurant) => {
            try {
                await generateEodReport(restaurant.id, reportDate)
                return restaurant.name
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'unknown error'
                throw new Error(`${restaurant.name}: ${msg}`)
            }
        })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failures = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason?.message ?? 'unknown error')

    if (failures.length > 0) {
        console.error('[cron/generate-eod-reports] failures:', failures)
    }

    return Response.json({
        reportDate,
        total: restaurants.length,
        generated: succeeded,
        failures,
    })
}
