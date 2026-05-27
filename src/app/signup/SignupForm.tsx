'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signupRestaurant } from './actions'
import {
    ChevronRight, ChevronLeft, Check, Loader2, Building2,
    User, Zap, Crown, Star, Sparkles
} from 'lucide-react'

type Step = 1 | 2 | 3 | 4

const PLANS = [
    {
        id: 'free' as const,
        name: 'Free',
        price: 'रू 0',
        period: '/month',
        icon: <Zap size={20} className="text-gray-500" />,
        color: 'border-gray-200',
        selectedColor: 'border-gray-900 bg-gray-50',
        limits: '3 staff · 20 menu items',
        features: ['Menu management', 'QR ordering', 'Cash & QR payments', 'Service requests', 'Split billing'],
    },
    {
        id: 'basic' as const,
        name: 'Basic',
        price: 'रू 1,999',
        period: '/month',
        icon: <Star size={20} className="text-blue-500" />,
        color: 'border-blue-100',
        selectedColor: 'border-blue-500 bg-blue-50',
        limits: '10 staff · 100 menu items',
        features: ['Everything in Free', 'Takeout orders', 'Promo codes', 'Advanced analytics'],
        recommended: false,
    },
    {
        id: 'pro' as const,
        name: 'Pro',
        price: 'रू 4,999',
        period: '/month',
        icon: <Crown size={20} className="text-[#E85D04]" />,
        color: 'border-orange-100',
        selectedColor: 'border-[#E85D04] bg-orange-50',
        limits: '50 staff · 500 menu items',
        features: ['Everything in Basic', 'Loyalty program', 'Dynamic pricing', 'Ingredient tracking', 'Staff shifts'],
        recommended: true,
    },
    {
        id: 'enterprise' as const,
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        icon: <Sparkles size={20} className="text-purple-500" />,
        color: 'border-purple-100',
        selectedColor: 'border-purple-500 bg-purple-50',
        limits: 'Unlimited staff & menu',
        features: ['Everything in Pro', 'Multi-language', 'Dedicated support', 'Custom integrations'],
    },
]

function slugify(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function SignupForm() {
    const router = useRouter()
    const supabase = createClient()

    const [mounted, setMounted] = useState(false)
    const [step, setStep] = useState<Step>(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [globalError, setGlobalError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    // Form state
    const [plan, setPlan] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('pro')
    const [restaurantName, setRestaurantName] = useState('')
    const [restaurantSlug, setRestaurantSlug] = useState('')
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    const [panNumber, setPanNumber] = useState('')
    const [vatRegistered, setVatRegistered] = useState(false)
    const [ownerName, setOwnerName] = useState('')
    const [ownerEmail, setOwnerEmail] = useState('')
    const [ownerPassword, setOwnerPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // Set mounted to true after component hydrates
    useEffect(() => {
        setMounted(true)
    }, [])

    const selectedPlan = PLANS.find(p => p.id === plan)!

    const handleNameChange = (value: string) => {
        setRestaurantName(value)
        if (!restaurantSlug || restaurantSlug === slugify(restaurantName)) {
            setRestaurantSlug(slugify(value))
        }
    }

    const validateStep = (): boolean => {
        const errors: Record<string, string> = {}

        if (step === 2) {
            if (!restaurantName.trim() || restaurantName.trim().length < 2) errors.restaurantName = 'Restaurant name is required (2+ characters)'
            if (!restaurantSlug.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(restaurantSlug)) errors.restaurantSlug = 'Slug must be lowercase letters, numbers, and hyphens only'
            if (panNumber && !/^\d{9}$/.test(panNumber.trim())) errors.panNumber = 'PAN number must be exactly 9 digits'
        }

        if (step === 3) {
            if (!ownerName.trim() || ownerName.trim().length < 2) errors.ownerName = 'Full name is required'
            if (!ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) errors.ownerEmail = 'Valid email address is required'
            if (ownerPassword.length < 8) errors.ownerPassword = 'Password must be at least 8 characters'
            if (ownerPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
        }

        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleNext = () => {
        if (validateStep()) {
            setStep((s) => Math.min(s + 1, 4) as Step)
        }
    }

    const handleBack = () => {
        setGlobalError('')
        setStep((s) => Math.max(s - 1, 1) as Step)
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setGlobalError('')

        const result = await signupRestaurant({
            restaurantName,
            restaurantSlug,
            ownerFullName: ownerName,
            ownerEmail,
            ownerPassword,
            contactPhone: phone || undefined,
            address: address || undefined,
            panNumber: panNumber || undefined,
            vatRegistered,
            subscriptionTier: plan,
        })

        if (result.error) {
            setGlobalError(result.error)
            if (result.field) {
                setFieldErrors({ [result.field]: result.error })
                // Go back to the step with the error
                if (result.field === 'restaurantSlug') setStep(2)
                if (result.field === 'ownerEmail') setStep(3)
            }
            setIsSubmitting(false)
            return
        }

        // Auto sign-in with the credentials the user just entered
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: ownerEmail,
            password: ownerPassword,
        })

        if (signInError) {
            // Account was created but sign-in failed — redirect to login
            router.push('/login?registered=1')
        } else {
            router.push('/admin/dashboard')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create Your Restaurant</h1>
                    <p className="text-gray-500 mt-2">Get started in minutes. No credit card required.</p>
                </div>

                {/* Step indicator - only show after hydration */}
                {mounted && (
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {(['Plan', 'Restaurant', 'Account', 'Review'] as const).map((label, i) => {
                            const num = i + 1
                            const done = num < step
                            const active = num === step
                            return (
                                <div key={label} className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                                        done ? 'bg-green-500 text-white' : active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                        {done ? <Check size={14} /> : num}
                                    </div>
                                    <span className={`text-sm hidden sm:inline ${active ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
                                    {i < 3 && <ChevronRight size={14} className="text-gray-300" />}
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Step 1: Plan Selection */}
                    {step === 1 && (
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">Choose your plan</h2>
                            <p className="text-sm text-gray-500">No payment required now. You can upgrade anytime.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PLANS.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setPlan(p.id)}
                                        className={`relative text-left p-4 rounded-xl border-2 transition-colors ${
                                            plan === p.id ? p.selectedColor : `${p.color} hover:border-gray-300`
                                        }`}
                                    >
                                        {p.recommended && (
                                            <span className="absolute -top-2.5 left-3 bg-[#E85D04] text-white text-xs font-bold px-2 py-0.5 rounded-full">Recommended</span>
                                        )}
                                        <div className="flex items-center gap-2 mb-2">
                                            {p.icon}
                                            <span className="font-semibold text-gray-900">{p.name}</span>
                                            {plan === p.id && <Check size={14} className="text-green-600 ml-auto" />}
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">{p.price}<span className="text-sm font-normal text-gray-400">{p.period}</span></div>
                                        <div className="text-xs text-gray-500 mt-1">{p.limits}</div>
                                        <ul className="mt-3 space-y-1">
                                            {p.features.map((f) => (
                                                <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                                                    <Check size={11} className="text-green-500 shrink-0" />{f}
                                                </li>
                                            ))}
                                        </ul>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Restaurant Details */}
                    {step === 2 && (
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Building2 size={20} className="text-[#E85D04]" /> Restaurant Details
                            </h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
                                <input
                                    type="text"
                                    value={restaurantName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="e.g. Himalayan Kitchen"
                                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04] ${fieldErrors.restaurantName ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {fieldErrors.restaurantName && <p className="text-red-500 text-xs mt-1">{fieldErrors.restaurantName}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
                                <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#E85D04]/20 focus-within:border-[#E85D04]">
                                    <span className="bg-gray-50 px-3 py-2.5 text-sm text-gray-400 border-r border-gray-300 shrink-0">app.com/t/</span>
                                    <input
                                        type="text"
                                        value={restaurantSlug}
                                        onChange={(e) => setRestaurantSlug(slugify(e.target.value))}
                                        placeholder="himalayan-kitchen"
                                        className={`flex-1 px-3 py-2.5 text-sm focus:outline-none ${fieldErrors.restaurantSlug ? 'border-red-400' : ''}`}
                                    />
                                </div>
                                {fieldErrors.restaurantSlug ? (
                                    <p className="text-red-500 text-xs mt-1">{fieldErrors.restaurantSlug}</p>
                                ) : (
                                    <p className="text-gray-400 text-xs mt-1">This is the URL your customers will use to order</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Thamel, Kathmandu"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+977 98XXXXXXXX"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                                    <input
                                        type="text"
                                        value={panNumber}
                                        onChange={(e) => setPanNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                        placeholder="9 digits"
                                        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04] ${fieldErrors.panNumber ? 'border-red-400' : 'border-gray-300'}`}
                                    />
                                    {fieldErrors.panNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.panNumber}</p>}
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={vatRegistered}
                                            onChange={(e) => setVatRegistered(e.target.checked)}
                                            className="w-4 h-4 rounded accent-[#E85D04]"
                                        />
                                        <span className="text-sm text-gray-700">VAT Registered</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Owner Account */}
                    {step === 3 && (
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <User size={20} className="text-[#E85D04]" /> Owner Account
                            </h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    placeholder="Ram Prasad Sharma"
                                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04] ${fieldErrors.ownerName ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {fieldErrors.ownerName && <p className="text-red-500 text-xs mt-1">{fieldErrors.ownerName}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                <input
                                    type="email"
                                    value={ownerEmail}
                                    onChange={(e) => setOwnerEmail(e.target.value)}
                                    placeholder="owner@restaurant.com"
                                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04] ${fieldErrors.ownerEmail ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {fieldErrors.ownerEmail && <p className="text-red-500 text-xs mt-1">{fieldErrors.ownerEmail}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <input
                                    type="password"
                                    value={ownerPassword}
                                    onChange={(e) => setOwnerPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04] ${fieldErrors.ownerPassword ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {fieldErrors.ownerPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.ownerPassword}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04] ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review & Submit */}
                    {step === 4 && (
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">Review & Create</h2>

                            <div className="bg-gray-50 rounded-xl divide-y divide-gray-200 text-sm">
                                <div className="px-4 py-3 flex justify-between">
                                    <span className="text-gray-500">Plan</span>
                                    <span className="font-semibold text-gray-900">{selectedPlan.name} — {selectedPlan.price}{selectedPlan.period}</span>
                                </div>
                                <div className="px-4 py-3 flex justify-between">
                                    <span className="text-gray-500">Restaurant</span>
                                    <span className="font-semibold text-gray-900">{restaurantName}</span>
                                </div>
                                <div className="px-4 py-3 flex justify-between">
                                    <span className="text-gray-500">URL Slug</span>
                                    <span className="font-mono text-gray-700">/t/{restaurantSlug}</span>
                                </div>
                                {address && (
                                    <div className="px-4 py-3 flex justify-between">
                                        <span className="text-gray-500">Address</span>
                                        <span className="text-gray-700">{address}</span>
                                    </div>
                                )}
                                {panNumber && (
                                    <div className="px-4 py-3 flex justify-between">
                                        <span className="text-gray-500">PAN</span>
                                        <span className="text-gray-700">{panNumber} {vatRegistered ? '· VAT Registered' : ''}</span>
                                    </div>
                                )}
                                <div className="px-4 py-3 flex justify-between">
                                    <span className="text-gray-500">Owner</span>
                                    <span className="text-gray-700">{ownerName}</span>
                                </div>
                                <div className="px-4 py-3 flex justify-between">
                                    <span className="text-gray-500">Email</span>
                                    <span className="text-gray-700">{ownerEmail}</span>
                                </div>
                            </div>

                            {globalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    {globalError}
                                </div>
                            )}

                            <p className="text-xs text-gray-400 text-center">
                                By creating an account you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className={`px-6 py-4 bg-gray-50 border-t border-gray-100 flex ${step > 1 ? 'justify-between' : 'justify-end'}`}>
                        {step > 1 && (
                            <button onClick={handleBack} disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50">
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}

                        {step < 4 ? (
                            <button onClick={handleNext} className="flex items-center gap-1.5 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:scale-[0.98] transition">
                                Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#E85D04] text-white text-sm font-semibold rounded-xl hover:bg-[#E85D04]/90 active:scale-[0.98] transition disabled:opacity-60"
                            >
                                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Check size={16} /> Create My Restaurant</>}
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Already have an account?{' '}
                    <a href="/login" className="font-medium text-[#E85D04] hover:underline">Sign in</a>
                </p>
            </div>
        </div>
    )
}
