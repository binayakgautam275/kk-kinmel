'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from './actions'
import Logo from '@/components/shared/Logo'
import { Eye, EyeOff, Mail, Phone, Apple } from 'lucide-react'

const initialState = { error: null as string | null }

export function LoginForm({ redirectTo }: { redirectTo: string }) {
    const [state, formAction, isPending] = useActionState(loginAction, initialState)
    const [showPassword, setShowPassword] = useState(false)
    const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone')
    const [isSignUp, setIsSignUp] = useState(false)

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-[440px]">
            {/* Logo Section */}
            <div className="mb-6 flex justify-center">
                <Logo className="h-10" />
            </div>

            {/* Main Card */}
            <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-10 flex flex-col items-center">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">{isSignUp ? 'Create Account' : 'Welcome 👋'}</h1>
                    <p className="text-sm text-gray-500 font-medium">{isSignUp ? 'Sign up to get started' : 'Login to manage your restaurant'}</p>
                </div>

                <form action={formAction} className="w-full flex flex-col gap-5">
                    <input type="hidden" name="actionType" value={isSignUp ? 'signup' : 'login'} />

                    {state?.error && (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100 font-medium text-center">
                            {state.error}
                        </div>
                    )}

                    {/* Dynamic Input based on method */}
                    <div className="flex flex-col gap-5">
                        {isSignUp && (
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                required
                                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all duration-300"
                                placeholder="Enter full name"
                            />
                        )}
                        {loginMethod === 'phone' ? (
                            <div className="flex h-11 w-full rounded-xl border border-gray-200 overflow-hidden bg-white focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all">
                                <button type="button" className="flex items-center gap-2 px-3 bg-gray-50 border-r border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                                    <span className="text-lg leading-none">🇳🇵</span> +977
                                </button>
                                <input
                                    id="phone"
                                    name="email" // Mapped to email for backend compatibility
                                    type="tel"
                                    className="flex-1 px-3 text-sm outline-none text-gray-900 placeholder:text-gray-400 w-full"
                                    placeholder="Enter mobile number"
                                />
                            </div>
                        ) : (
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:pl-5 transition-all duration-300"
                                placeholder="Enter email address"
                            />
                        )}

                        {/* Password Field (kept for backend compatibility) */}
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 text-sm outline-none text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Turnstile Placeholder */}
                    <div className="h-16 w-full border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between px-4 mt-2">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 border-2 border-gray-300 rounded bg-white"></div>
                            <span className="text-sm font-medium text-gray-700">Verify you are human</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium text-right leading-tight">
                            Cloudflare<br/>Turnstile
                        </div>
                    </div>

                    <p className="text-xs text-center text-gray-500 font-medium leading-relaxed mt-2">
                        By signing up, you agree to our{' '}
                        <a href="#" className="text-gray-900 underline hover:text-[var(--color-primary)] transition-colors">Privacy Policies</a> &{' '}
                        <a href="#" className="text-gray-900 underline hover:text-[var(--color-primary)] transition-colors">Terms and Conditions</a>
                    </p>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white h-11 rounded-xl text-sm font-bold shadow-md shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isPending ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            isSignUp ? 'Sign Up' : 'Continue'
                        )}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                        {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                </p>

                <div className="w-full flex items-center gap-3 my-6">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">or</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                <div className="w-full flex flex-col gap-3 mb-6">
                    <button type="button" className="w-full h-11 flex items-center justify-center gap-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">Continue with Google</span>
                    </button>
                    <button type="button" className="w-full h-11 flex items-center justify-center gap-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm">
                        <Apple className="w-5 h-5 text-gray-900 fill-current" />
                        <span className="text-sm font-semibold text-gray-700">Continue with Apple</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => setLoginMethod(prev => prev === 'phone' ? 'email' : 'phone')}
                    className="w-full h-11 flex items-center justify-center gap-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm text-sm font-semibold text-gray-700"
                >
                    {loginMethod === 'phone' ? (
                        <><Mail size={18} className="text-gray-500"/> Use email instead</>
                    ) : (
                        <><Phone size={18} className="text-gray-500"/> Use number instead</>
                    )}
                </button>
            </div>

            {/* Demo Accounts (Subtle placement beneath the card) */}
            <details className="mt-8 group w-full bg-white/50 border border-gray-200 backdrop-blur rounded-2xl">
                <summary className="text-xs font-semibold text-gray-500 p-4 cursor-pointer flex justify-center hover:text-gray-700 transition-colors list-none text-center">
                    Development: Show Demo Accounts
                </summary>
                <div className="p-4 pt-0 grid grid-cols-2 gap-2 border-t border-gray-100">
                    {[
                        { label: 'New User', email: 'newuser@srms.app', color: 'bg-pink-100 text-pink-700 hover:bg-pink-200' },
                        { label: 'Super Admin', email: 'demo@srms.app', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                        { label: 'Manager',    email: 'manager@srms.app', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                        { label: 'Kitchen',    email: 'kitchen@srms.app', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                        { label: 'Waiter',     email: 'waiter@srms.app',  color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                    ].map(({ label, email, color }) => (
                        <button
                            key={email}
                            type="button"
                            className={`text-[11px] font-bold py-2 px-3 rounded-lg transition shadow-sm ${color}`}
                            onClick={() => {
                                setLoginMethod('email')
                                setTimeout(() => {
                                    const f = document.getElementById('email') as HTMLInputElement | null
                                    const p = document.getElementById('password') as HTMLInputElement | null
                                    if (f) f.value = email
                                    if (p) p.value = 'Password123!'
                                }, 10)
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </details>
        </div>
    )
}
