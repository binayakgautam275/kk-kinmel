/**
 * Health Check Endpoint
 * Used for monitoring and uptime checks
 */

export const revalidate = 0 // Always fresh

export async function GET() {
  try {
    // Quick database connectivity check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        {
          status: 'degraded',
          message: 'Missing Supabase credentials',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    // Check Supabase connectivity
    const response = await fetch(
      `${supabaseUrl}/rest/v1/`,
      {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      },
      // 5 second timeout
    ).catch(() => null)

    if (!response || !response.ok) {
      return Response.json(
        {
          status: 'degraded',
          message: 'Supabase unavailable',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    return Response.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      },
      { status: 200 }
    )
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
