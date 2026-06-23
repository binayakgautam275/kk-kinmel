// lib/supabase/middleware.ts
// Supabase client for Edge Middleware — used for RBAC, session validation, rate limiting
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make your application
    // very slow due to unnecessary session refreshing.
    const { data, error } = await supabase.auth.getUser()
    let user = data.user

    // Stale/expired refresh token: Supabase otherwise retries the refresh on every
    // request, flooding logs with `refresh_token_not_found` (400) and blocking.
    // Clear the auth cookies once so the browser stops re-sending the dead token —
    // the visitor is simply treated as logged out.
    if (
        error &&
        (error.code === 'refresh_token_not_found' || /refresh token/i.test(error.message))
    ) {
        user = null
        for (const cookie of request.cookies.getAll()) {
            if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
                supabaseResponse.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
            }
        }
    }

    return { user, supabaseResponse, supabase }
}
