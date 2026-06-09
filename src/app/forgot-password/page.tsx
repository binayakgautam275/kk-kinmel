'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from './actions'
import VideoLogo from '@/components/shared/VideoLogo'
import { Mail, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react'

const initialState = { error: null as string | null, success: false }

export default function ForgotPasswordPage() {
    const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState)

    if (state.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-6">
                <div className="w-full max-w-sm text-center animate-scale-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-50 border border-green-100 mb-5">
                        <CheckCircle2 size={32} className="text-green-500" />
                    </div>
                    <h1 className="text-xl font-bold text-[var(--color-secondary)] mb-2">Check your inbox</h1>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                        If an account exists for that email, we sent a password reset link. It expires in 1 hour.
                    </p>
                    <Link href="/login"
                          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                        <ArrowLeft size={14} /> Back to login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-6">
            <div className="w-full max-w-sm animate-fade-up">
                <div className="flex justify-center mb-8">
                    <VideoLogo className="h-8" />
                </div>

                <div className="mb-7">
                    <h1 className="text-2xl font-bold text-[var(--color-secondary)]">Reset your password</h1>
                    <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send a reset link.</p>
                </div>

                <form action={formAction} className="space-y-4">
                    {state.error && (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                            {state.error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                            Email address
                        </label>
                        <div className="relative">
                            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoFocus
                                className="input-base pl-10"
                                placeholder="you@restaurant.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full btn-primary py-3 text-sm rounded-xl justify-center mt-1"
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2 justify-center">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending…
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 justify-center">
                                Send reset link <ArrowRight size={15} />
                            </span>
                        )}
                    </button>
                </form>

                <div className="mt-7 text-center">
                    <Link href="/login"
                          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
                        <ArrowLeft size={14} /> Back to login
                    </Link>
                </div>
            </div>
        </div>
    )
}
