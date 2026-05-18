// src/proxy.ts
// Edge Proxy — handles auth session refresh, RBAC routing, and session validation
// Next.js 16 uses "proxy.ts" instead of "middleware.ts"
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Role-based route access map
const ROLE_ACCESS: Record<string, string[]> = {
    '/kitchen': ['kitchen', 'manager', 'super_admin'],
    '/waiter': ['waiter', 'manager', 'super_admin'],
    '/admin/dashboard': ['manager', 'super_admin'],
    '/admin/menu': ['manager', 'super_admin'],
    '/admin/staff': ['manager', 'super_admin'],
    '/admin/tables': ['manager', 'super_admin'],
    '/admin/settings': ['manager', 'super_admin'],
    '/admin/analytics': ['manager', 'super_admin'],
    '/admin/pricing': ['manager', 'super_admin'],
    '/admin/promos': ['manager', 'super_admin'],
    '/admin/loyalty': ['manager', 'super_admin'],
    '/admin/reports': ['manager', 'super_admin'],
    '/admin/ingredients': ['manager', 'super_admin'],
    '/admin/shifts': ['manager', 'super_admin'],
    '/admin/takeout': ['manager', 'super_admin'],
    '/admin/orders': ['waiter', 'manager', 'super_admin'],
    '/admin/payments': ['manager', 'super_admin'],
    '/admin/theme': ['manager', 'super_admin'],
    '/admin/homepage': ['manager', 'super_admin'],
    '/admin/super-admin': ['super_admin'],
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // ----------------------------------------------------------
    // 1. Public customer routes: /t/{tableSlug}
    //    Validate session token from query param
    // ----------------------------------------------------------
    if (pathname.startsWith('/t/')) {
        // Session validation will be handled at the page level
        // Middleware just refreshes any existing auth session
        const { supabaseResponse } = await updateSession(request)
        return supabaseResponse
    }

    // ----------------------------------------------------------
    // 2. Staff & Admin routes: require authentication + role check
    // ----------------------------------------------------------
    const protectedPrefixes = [
        '/kitchen', '/waiter',
        '/admin/dashboard', '/admin/menu', '/admin/staff', '/admin/tables',
        '/admin/settings', '/admin/analytics', '/admin/pricing', '/admin/promos',
        '/admin/loyalty', '/admin/reports', '/admin/ingredients', '/admin/shifts',
        '/admin/takeout', '/admin/orders', '/admin/payments', '/admin/theme',
        '/admin/homepage', '/admin/super-admin',
    ]

    const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))

    if (isProtected) {
        const { user, supabaseResponse, supabase } = await updateSession(request)

        if (!user) {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirect', pathname)
            return NextResponse.redirect(loginUrl)
        }

        // Decode JWT claims (app_role, restaurant_id) without a DB roundtrip.
        // getSession() reads the already-validated cookie — no network call.
        const { data: { session } } = await supabase.auth.getSession()
        let userRole: string | undefined
        let jwtRestaurantId: string | undefined

        if (session?.access_token) {
            try {
                const payload = JSON.parse(
                    Buffer.from(session.access_token.split('.')[1], 'base64url').toString('utf-8')
                )
                userRole = payload.app_role
                jwtRestaurantId = payload.restaurant_id
            } catch { /* fall through to DB fallback */ }
        }

        // Fallback: JWT decode failed — query DB for role
        if (!userRole) {
            const adminSupabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                {
                    cookies: {
                        getAll() { return request.cookies.getAll() },
                        setAll() { /* no-op */ },
                    },
                }
            )
            const { data: userData } = await adminSupabase
                .from('users')
                .select('restaurant_id, roles(name)')
                .eq('id', user.id)
                .single()
            userRole = (userData?.roles as unknown as { name: string } | null)?.name
            jwtRestaurantId = userData?.restaurant_id ?? undefined
        }

        // Check suspension only for admin non-super-admin routes (lightweight pk lookup)
        let isSuspended = false
        if (pathname.startsWith('/admin') && userRole !== 'super_admin' && jwtRestaurantId) {
            const adminSupabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                {
                    cookies: {
                        getAll() { return request.cookies.getAll() },
                        setAll() { /* no-op */ },
                    },
                }
            )
            const { data: restaurant } = await adminSupabase
                .from('restaurants')
                .select('is_suspended')
                .eq('id', jwtRestaurantId)
                .single()
            isSuspended = restaurant?.is_suspended ?? false
        }

        if (!userRole) {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }

        // Block suspended restaurants from admin access (kitchen/waiter still allowed)
        if (isSuspended && pathname.startsWith('/admin') && userRole !== 'super_admin') {
            return NextResponse.redirect(new URL('/suspended', request.url))
        }

        // Check role-based access
        for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ACCESS)) {
            if (pathname.startsWith(routePrefix) && !allowedRoles.includes(userRole)) {
                return NextResponse.redirect(new URL('/unauthorized', request.url))
            }
        }

        return supabaseResponse
    }

    // ----------------------------------------------------------
    // 3. All other routes: just refresh the session
    // ----------------------------------------------------------
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets
         */
        '/((?!_next/static|_next/image|favicon.ico|icons/|sounds/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
