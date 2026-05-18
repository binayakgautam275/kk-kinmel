import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 0

export async function GET() {
    try {
        const supabase = await createAdminClient()

        // Verify real DB connectivity with a lightweight count query
        const { error: dbError } = await supabase
            .from('restaurants')
            .select('id', { count: 'exact', head: true })

        if (dbError) {
            return Response.json(
                { status: 'degraded', message: 'Database unreachable', timestamp: new Date().toISOString() },
                { status: 503 }
            )
        }

        return Response.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
        })
    } catch (error) {
        return Response.json(
            {
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        )
    }
}
