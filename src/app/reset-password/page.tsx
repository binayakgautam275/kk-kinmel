'use client'

import { Suspense, useState, useEffect, useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordAction } from './actions'
import Logo from '@/components/shared/Logo'
import { Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'

const initialState = { error: null as string | null, success: false }

const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-6">
        <div className="w-full max-w-sm animate-scale-in">
            <div className="flex justify-center mb-8">
                <Logo className="h-8" />
            </div>
            {children}
        </div>
    </div>
)

function ResetPasswordForm() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [sessionReady, setSessionReady] = useState(false)
    const [sessionError, setSessionError] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)

    useEffect(() => {
        const code = searchParams.get('code')
        if (!code) { setSessionError(true); return }
        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (error) setSessionError(true)
            else setSessionReady(true)
        })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (state.success) setTimeout(() => router.push('/login'), 2000)
    }, [state.success, router])

    if (sessionError) return (
        <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 border border-red-100 mb-5">
                <AlertTriangle size={30} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired</h1>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                This password reset link has expired or already been used. Please request a new one.
            </p>
            <a href="/forgot-password" className="btn-primary py-2.5 px-6 text-sm rounded-xl">
                Request new link
            </a>
        </div>
    )

    if (state.success) return (
        <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-50 border border-green-100 mb-5">
                <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated!</h1>
            <p className="text-sm text-gray-400">Redirecting you to login…</p>
        </div>
    )

    if (!sessionReady) return (
        <div className="text-center">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-400">Verifying reset link…</p>
        </div>
    )

    return (
        <>
            <div className="mb-7">
                <h1 className="text-2xl font-bold text-[var(--color-secondary)]">Set new password</h1>
                <p className="text-sm text-gray-500 mt-1">Choose a strong password of at least 8 characters.</p>
            </div>

            <form action={formAction} className="space-y-4">
                {state.error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                        {state.error}
                    </div>
                )}

                {[
                    { id: 'password', label: 'New password', show: showPassword, toggle: () => setShowPassword(p => !p) },
                    { id: 'confirm',  label: 'Confirm password', show: showConfirm, toggle: () => setShowConfirm(p => !p) },
                ].map(f => (
                    <div key={f.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor={f.id}>
                            {f.label}
                        </label>
                        <div className="relative">
                            <input
                                id={f.id}
                                name={f.id}
                                type={f.show ? 'text' : 'password'}
                                required
                                minLength={8}
                                className="input-base pr-12"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={f.toggle} tabIndex={-1}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1">
                                {f.show ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>
                ))}

                <button type="submit" disabled={isPending}
                        className="w-full btn-primary py-3 text-sm rounded-xl justify-center mt-1">
                    {isPending ? (
                        <span className="flex items-center gap-2 justify-center">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Updating…
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 justify-center">
                            Update password <ArrowRight size={15} />
                        </span>
                    )}
                </button>
            </form>
        </>
    )
}

export default function ResetPasswordPage() {
    return (
        <Shell>
            <Suspense fallback={
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-400">Loading…</p>
                </div>
            }>
                <ResetPasswordForm />
            </Suspense>
        </Shell>
    )
}
