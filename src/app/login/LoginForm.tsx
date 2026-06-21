'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from './actions'
import Logo from '@/components/shared/Logo'
import { Eye, EyeOff, ArrowRight, ChefHat, QrCode, BarChart3 } from 'lucide-react'

const initialState = { error: null as string | null }

export function LoginForm({ redirectTo }: { redirectTo: string }) {
    const [state, formAction, isPending] = useActionState(loginAction, initialState)
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="min-h-screen w-full flex">
            {/* Left — brand panel */}
            <div className="hidden lg:flex lg:w-[44%] relative flex-col justify-between p-12 overflow-hidden"
                 style={{ background: 'linear-gradient(145deg, #1B263B 0%, #243447 60%, #1a3a2a 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]"
                     style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

                <Logo className="h-9 relative z-10" variant="dark" />

                <div className="relative z-10 space-y-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white leading-tight">
                            Your restaurant,<br />running smarter.
                        </h2>
                        <p className="mt-3 text-gray-400 text-base leading-relaxed">
                            Real-time orders, kitchen display, eSewa payments, and analytics — all in one place.
                        </p>
                    </div>
                    <div className="space-y-4">
                        {[
                            { icon: <QrCode size={17} />, label: 'QR ordering', desc: 'Customers order from their phone' },
                            { icon: <ChefHat size={17} />, label: 'Kitchen display', desc: 'Live order queue for kitchen staff' },
                            { icon: <BarChart3 size={17} />, label: 'Analytics', desc: 'Revenue, trends, and reports' },
                        ].map(f => (
                            <div key={f.label} className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                                    {f.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{f.label}</p>
                                    <p className="text-xs text-gray-400">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-xs text-gray-600 relative z-10">© {new Date().getFullYear()} kkkhane · Built for Nepal</p>
            </div>

            {/* Right — form */}
            <div className="flex-1 flex items-center justify-center p-6 bg-[#FAFAF8]">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex justify-center mb-8">
                        <Logo className="h-8" />
                    </div>

                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">Welcome back</h1>
                        <p className="text-gray-500 text-sm mt-1">Sign in to your restaurant dashboard</p>
                    </div>

                    <form action={formAction} className="space-y-4">
                        <input type="hidden" name="redirect" value={redirectTo} />

                        {state?.error && (
                            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                                {state.error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="input-base"
                                placeholder="manager@myrestaurant.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                                    Password
                                </label>
                                <Link href="/forgot-password"
                                      className="text-xs text-[var(--color-primary)] hover:opacity-80 transition font-medium">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="input-base pr-12"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full btn-primary py-3 text-sm rounded-xl justify-center mt-2"
                        >
                            {isPending ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in…
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 justify-center">
                                    Sign in <ArrowRight size={16} />
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Quick Demo — fills email+password with one click */}
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                        <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-3">
                            Demo accounts · password: <span className="font-mono">Password123!</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Super Admin', email: 'demo@srms.app', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                                { label: 'Manager',    email: 'manager@srms.app', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                                { label: 'Kitchen',    email: 'kitchen@srms.app', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                                { label: 'Waiter',     email: 'waiter@srms.app',  color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                            ].map(({ label, email, color }) => (
                                <button
                                    key={email}
                                    type="button"
                                    className={`text-xs font-semibold py-2 px-3 rounded-xl transition ${color}`}
                                    onClick={() => {
                                        const f = document.getElementById('email') as HTMLInputElement | null
                                        const p = document.getElementById('password') as HTMLInputElement | null
                                        if (f) f.value = email
                                        if (p) p.value = 'Password123!'
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                        <p className="text-sm text-gray-500">
                            New restaurant?{' '}
                            <Link href="/signup" className="text-[var(--color-primary)] font-semibold hover:opacity-80 transition">
                                Create a free account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
