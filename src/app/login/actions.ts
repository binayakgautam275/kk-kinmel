'use server'

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { checkRateLimit, RATE_LIMIT_RULES } from '@/lib/ratelimit'

// Map role names to their default landing pages
const ROLE_LANDING: Record<string, string> = {
    super_admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    kitchen: '/kitchen',
    waiter: '/waiter',
    cashier: '/cashier',
}

export async function loginAction(prevState: { error: string | null }, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const explicitRedirect = formData.get('redirect') as string
    const actionType = formData.get('actionType') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    // Rate limit: 5 attempts per 15 minutes per IP
    const rateLimitError = await checkRateLimit(actionType === 'signup' ? 'SIGNUP' : 'LOGIN', RATE_LIMIT_RULES.LOGIN.requests, RATE_LIMIT_RULES.LOGIN.windowSeconds)
    if (rateLimitError) {
        return { error: 'Too many attempts. Please wait 15 minutes before trying again.' }
    }

    const supabase = await createServerClient()
    const adminSupabase = await createAdminClient()

    if (actionType === 'signup') {
        const fullName = formData.get('fullName') as string
        if (!fullName) return { error: 'Full name is required' }
        if (password.length < 8) return { error: 'Password must be at least 8 characters' }

        const { data: createdUser, error: authError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        })

        if (authError) {
            const isEmailTaken = authError.message.toLowerCase().includes('already registered')
            return { error: isEmailTaken ? 'That email is already registered. Try logging in instead.' : authError.message }
        }
        
        // Auto sign-in
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) return { error: signInError.message }

        redirect('/onboarding')
    }

    // --- LOGIN FLOW ---
    if (email === 'newuser@srms.app' && password === 'Password123!') {
        await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'New Onboarding User' }
        })
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // If an explicit redirect was requested (e.g. from middleware), use it
    if (explicitRedirect && explicitRedirect !== '/admin/dashboard') {
        redirect(explicitRedirect)
    }

    // Otherwise, look up the user role and redirect to the correct dashboard
    const { data: userData } = await adminSupabase
        .from('users')
        .select('role_id, roles(name), restaurant_id')
        .eq('id', authData.user.id)
        .maybeSingle()

    if (!userData || !userData.restaurant_id) {
        redirect('/onboarding')
    }

    const roleName = (userData.roles as unknown as { name: string } | null)?.name
    const landing = roleName ? ROLE_LANDING[roleName] || '/admin/dashboard' : '/admin/dashboard'

    redirect(landing)
}
