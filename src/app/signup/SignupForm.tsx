'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signupRestaurant } from './actions'
import {
    ChevronRight, ChevronLeft, Check, Loader2, Building2,
    User, Zap, Crown, Star, Sparkles, MapPin, Phone, Mail,
    FileText, Camera, Navigation, X, AlertTriangle,
} from 'lucide-react'
import Image from 'next/image'

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

const INPUT = 'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D04]/20 focus:border-[#E85D04] transition'

export default function SignupForm() {
    const router = useRouter()
    const supabase = createClient()
    const logoInputRef = useRef<HTMLInputElement>(null)

    const [mounted, setMounted] = useState(false)
    const [step, setStep] = useState<Step>(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [globalError, setGlobalError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    // Step 1
    const [plan, setPlan] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('pro')

    // Step 2 — restaurant details
    const [restaurantName, setRestaurantName] = useState('')
    const [restaurantSlug, setRestaurantSlug] = useState('')
    const [slogan, setSlogan] = useState('')
    const [address, setAddress] = useState('')
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
    const [phone, setPhone] = useState('')
    const [telephone, setTelephone] = useState('')
    const [restaurantEmail, setRestaurantEmail] = useState('')
    const [panNumber, setPanNumber] = useState('')
    const [vatRegistered, setVatRegistered] = useState(false)
    const [vatNumber, setVatNumber] = useState('')
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    // Tracks the live object URL so we can revoke the old one before replacing it
    // and on unmount — otherwise each logo pick leaks a blob URL.
    const logoPreviewRef = useRef<string | null>(null)

    // Step 3 — owner
    const [ownerName, setOwnerName] = useState('')
    const [ownerEmail, setOwnerEmail] = useState('')
    const [ownerPassword, setOwnerPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    useEffect(() => { setMounted(true) }, [])
    useEffect(() => () => { if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current) }, [])

    const selectedPlan = PLANS.find(p => p.id === plan)!

    const handleNameChange = (value: string) => {
        setRestaurantName(value)
        if (!restaurantSlug || restaurantSlug === slugify(restaurantName)) {
            setRestaurantSlug(slugify(value))
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) { setFieldErrors(p => ({ ...p, logo: 'Logo must be under 2 MB' })); return }
        setLogoFile(file)
        if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current)
        const url = URL.createObjectURL(file)
        logoPreviewRef.current = url
        setLogoPreview(url)
        setFieldErrors(p => { const n = { ...p }; delete n.logo; return n })
    }

    const handleGeolocate = () => {
        if (!navigator.geolocation) { setGeoStatus('error'); return }
        setGeoStatus('loading')
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords
                setLatitude(lat)
                setLongitude(lng)
                // Reverse geocode via OpenStreetMap Nominatim (free, no key needed)
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                        { headers: { 'Accept-Language': 'en' } }
                    )
                    const json = await res.json()
                    const display = json.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                    setAddress(display)
                } catch {
                    setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
                }
                setGeoStatus('done')
            },
            () => setGeoStatus('error'),
            { timeout: 10000, maximumAge: 60000 }
        )
    }

    const clearGeo = () => {
        setLatitude(null); setLongitude(null); setGeoStatus('idle'); setAddress('')
    }

    const validateStep = (): boolean => {
        const errors: Record<string, string> = {}

        if (step === 2) {
            if (!restaurantName.trim() || restaurantName.trim().length < 2) errors.restaurantName = 'Restaurant name is required (2+ characters)'
            if (!restaurantSlug.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(restaurantSlug)) errors.restaurantSlug = 'Slug must be lowercase letters, numbers, and hyphens only'
            if (panNumber && !/^\d{9}$/.test(panNumber.trim())) errors.panNumber = 'PAN number must be exactly 9 digits'
            if (vatRegistered && vatNumber && !/^\d{9}$/.test(vatNumber.trim())) errors.vatNumber = 'VAT number must be exactly 9 digits'
            if (restaurantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(restaurantEmail)) errors.restaurantEmail = 'Invalid email address'
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

    const handleNext = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 4) as Step) }
    const handleBack = () => { setGlobalError(''); setStep((s) => Math.max(s - 1, 1) as Step) }

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
            slogan: slogan || undefined,
            telephone: telephone || undefined,
            restaurantEmail: restaurantEmail || undefined,
            panNumber: panNumber || undefined,
            vatRegistered,
            vatNumber: vatNumber || undefined,
            latitude: latitude ?? undefined,
            longitude: longitude ?? undefined,
            subscriptionTier: plan,
        })

        if (result.error) {
            setGlobalError(result.error)
            if (result.field) {
                setFieldErrors({ [result.field]: result.error })
                if (result.field === 'restaurantSlug') setStep(2)
                if (result.field === 'ownerEmail') setStep(3)
            }
            setIsSubmitting(false)
            return
        }

        // Auto sign-in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: ownerEmail, password: ownerPassword,
        })

        if (!signInError && logoFile) {
            // Upload logo after sign-in so we have auth context
            try {
                const ext = logoFile.name.split('.').pop()
                const path = `logos/${restaurantSlug}-${Date.now()}.${ext}`
                const { error: uploadErr } = await supabase.storage
                    .from('restaurant-assets')
                    .upload(path, logoFile, { upsert: true })
                if (!uploadErr) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('restaurant-assets')
                        .getPublicUrl(path)
                    // Update logo_url on restaurant
                    await supabase
                        .from('restaurants')
                        .update({ logo_url: publicUrl })
                        .eq('slug', restaurantSlug)
                }
            } catch { /* logo upload is optional — don't block */ }
        }

        router.push(signInError ? '/login?registered=1' : '/admin/dashboard')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create Your Restaurant</h1>
                    <p className="text-gray-500 mt-2">Get started in minutes. No credit card required.</p>
                </div>

                {mounted && (
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {(['Plan', 'Restaurant', 'Account', 'Review'] as const).map((label, i) => {
                            const num = i + 1
                            const done = num < step
                            const active = num === step
                            return (
                                <div key={label} className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${done ? 'bg-green-500 text-white' : active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
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
                    {/* ── Step 1: Plan ── */}
                    {step === 1 && (
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">Choose your plan</h2>
                            <p className="text-sm text-gray-500">No payment required now. Upgrade anytime.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PLANS.map((p) => (
                                    <button key={p.id} onClick={() => setPlan(p.id)}
                                            className={`relative text-left p-4 rounded-xl border-2 transition-colors ${plan === p.id ? p.selectedColor : `${p.color} hover:border-gray-300`}`}>
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

                    {/* ── Step 2: Restaurant Details ── */}
                    {step === 2 && (
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Building2 size={20} className="text-[#E85D04]" /> Restaurant Details
                            </h2>

                            {/* Logo upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Logo <span className="text-gray-400 font-normal">(optional)</span></label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                        {logoPreview ? (
                                            <Image src={logoPreview} alt="Logo preview" width={80} height={80} className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera size={24} className="text-gray-300" />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <button type="button" onClick={() => logoInputRef.current?.click()}
                                                className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                        </button>
                                        {logoPreview && (
                                            <button type="button" onClick={() => { setLogoFile(null); if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current); logoPreviewRef.current = null; setLogoPreview(null) }}
                                                    className="block text-xs text-red-500 hover:underline">Remove</button>
                                        )}
                                        <p className="text-xs text-gray-400">JPG, PNG · Max 2 MB · Can be changed in Settings</p>
                                    </div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                </div>
                                {fieldErrors.logo && <p className="text-red-500 text-xs mt-1">{fieldErrors.logo}</p>}
                            </div>

                            {/* Name + Slug */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
                                    <input type="text" value={restaurantName} onChange={(e) => handleNameChange(e.target.value)}
                                           placeholder="e.g. Himalayan Kitchen"
                                           className={`${INPUT} ${fieldErrors.restaurantName ? 'border-red-400' : 'border-gray-300'}`} />
                                    {fieldErrors.restaurantName && <p className="text-red-500 text-xs mt-1">{fieldErrors.restaurantName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Slogan <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <input type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)}
                                           placeholder="Taste of the Himalayas"
                                           className={`${INPUT} border-gray-300`} maxLength={120} />
                                </div>
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
                                <div className="flex rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#E85D04]/20 focus-within:border-[#E85D04]">
                                    <span className="bg-gray-50 px-3 py-2.5 text-sm text-gray-400 border-r border-gray-300 shrink-0">kkkhane.com/t/</span>
                                    <input type="text" value={restaurantSlug} onChange={(e) => setRestaurantSlug(slugify(e.target.value))}
                                           placeholder="himalayan-kitchen"
                                           className={`flex-1 px-3 py-2.5 text-sm focus:outline-none ${fieldErrors.restaurantSlug ? 'border-red-400' : ''}`} />
                                </div>
                                {fieldErrors.restaurantSlug
                                    ? <p className="text-red-500 text-xs mt-1">{fieldErrors.restaurantSlug}</p>
                                    : <p className="text-gray-400 text-xs mt-1">URL your customers will scan on QR codes</p>}
                            </div>

                            {/* Address with live geolocation */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <MapPin size={13} className="inline mr-1 text-gray-400" />Address
                                </label>
                                <div className="flex gap-2">
                                    <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); if (geoStatus === 'done') setGeoStatus('idle') }}
                                           placeholder="Thamel, Kathmandu, Nepal"
                                           className={`${INPUT} border-gray-300 flex-1`} />
                                    <button type="button" onClick={geoStatus === 'done' ? clearGeo : handleGeolocate}
                                            disabled={geoStatus === 'loading'}
                                            title={geoStatus === 'done' ? 'Clear location' : 'Use my current location'}
                                            className={`shrink-0 px-3 py-2.5 rounded-xl border text-sm font-medium transition flex items-center gap-1.5 ${
                                                geoStatus === 'done'
                                                    ? 'bg-green-50 border-green-300 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                            }`}>
                                        {geoStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> :
                                         geoStatus === 'done' ? <><Check size={14} /> Located</> :
                                         <><Navigation size={14} /> Locate</>}
                                    </button>
                                </div>
                                {geoStatus === 'error' && (
                                    <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                                        <AlertTriangle size={11} /> Location access denied. Enter address manually.
                                    </p>
                                )}
                                {geoStatus === 'done' && latitude && (
                                    <p className="text-green-600 text-xs mt-1">
                                        GPS captured: {latitude.toFixed(5)}, {longitude?.toFixed(5)}
                                    </p>
                                )}
                            </div>

                            {/* Phone + Telephone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Phone size={13} className="inline mr-1 text-gray-400" />Mobile Number
                                    </label>
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                           placeholder="+977 98XXXXXXXX"
                                           className={`${INPUT} border-gray-300`} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Phone size={13} className="inline mr-1 text-gray-400" />Telephone <span className="text-gray-400 font-normal">(landline, optional)</span>
                                    </label>
                                    <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
                                           placeholder="01-XXXXXXX"
                                           className={`${INPUT} border-gray-300`} />
                                </div>
                            </div>

                            {/* Restaurant email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Mail size={13} className="inline mr-1 text-gray-400" />Restaurant Email <span className="text-gray-400 font-normal">(optional, for customers to contact)</span>
                                </label>
                                <input type="email" value={restaurantEmail} onChange={(e) => setRestaurantEmail(e.target.value)}
                                       placeholder="info@himalayankitchen.com"
                                       className={`${INPUT} ${fieldErrors.restaurantEmail ? 'border-red-400' : 'border-gray-300'}`} />
                                {fieldErrors.restaurantEmail && <p className="text-red-500 text-xs mt-1">{fieldErrors.restaurantEmail}</p>}
                            </div>

                            {/* PAN / VAT */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <FileText size={12} /> Tax Registration
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number <span className="text-gray-400 font-normal">(optional)</span></label>
                                        <input type="text" value={panNumber}
                                               onChange={(e) => setPanNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                               placeholder="9 digits"
                                               className={`${INPUT} ${fieldErrors.panNumber ? 'border-red-400' : 'border-gray-300'}`} />
                                        {fieldErrors.panNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.panNumber}</p>}
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={vatRegistered} onChange={(e) => setVatRegistered(e.target.checked)}
                                                   className="w-4 h-4 rounded accent-[#E85D04]" />
                                            <span className="text-sm text-gray-700">VAT Registered</span>
                                        </label>
                                    </div>
                                </div>
                                {vatRegistered && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number *</label>
                                        <input type="text" value={vatNumber}
                                               onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                               placeholder="9-digit VAT number"
                                               className={`${INPUT} ${fieldErrors.vatNumber ? 'border-red-400' : 'border-gray-300'}`} />
                                        {fieldErrors.vatNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.vatNumber}</p>}
                                        <p className="text-xs text-blue-600 mt-1">
                                            VAT billing will apply Nepal government VAT rate (13%) on all receipts.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Owner Account ── */}
                    {step === 3 && (
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <User size={20} className="text-[#E85D04]" /> Owner Account
                            </h2>
                            <p className="text-sm text-gray-500">This is your personal login — keep it secure.</p>

                            {[
                                { id: 'ownerName', label: 'Full Name *', type: 'text', val: ownerName, set: setOwnerName, ph: 'Ram Prasad Sharma' },
                                { id: 'ownerEmail', label: 'Email Address *', type: 'email', val: ownerEmail, set: setOwnerEmail, ph: 'owner@restaurant.com' },
                                { id: 'ownerPassword', label: 'Password *', type: 'password', val: ownerPassword, set: setOwnerPassword, ph: 'At least 8 characters' },
                                { id: 'confirmPassword', label: 'Confirm Password *', type: 'password', val: confirmPassword, set: setConfirmPassword, ph: 'Re-enter password' },
                            ].map(f => (
                                <div key={f.id}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                    <input type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                                           className={`${INPUT} ${fieldErrors[f.id] ? 'border-red-400' : 'border-gray-300'}`} />
                                    {fieldErrors[f.id] && <p className="text-red-500 text-xs mt-1">{fieldErrors[f.id]}</p>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Step 4: Review ── */}
                    {step === 4 && (
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">Review & Create</h2>
                            <div className="bg-gray-50 rounded-xl divide-y divide-gray-200 text-sm">
                                {[
                                    { label: 'Plan', value: `${selectedPlan.name} — ${selectedPlan.price}${selectedPlan.period}` },
                                    { label: 'Restaurant', value: restaurantName },
                                    slogan ? { label: 'Slogan', value: slogan } : null,
                                    { label: 'URL', value: `/t/${restaurantSlug}` },
                                    address ? { label: 'Address', value: address } : null,
                                    latitude ? { label: 'GPS', value: `${latitude.toFixed(5)}, ${longitude?.toFixed(5)}` } : null,
                                    phone ? { label: 'Mobile', value: phone } : null,
                                    telephone ? { label: 'Telephone', value: telephone } : null,
                                    restaurantEmail ? { label: 'Restaurant Email', value: restaurantEmail } : null,
                                    panNumber ? { label: 'PAN', value: `${panNumber}${vatRegistered ? ' · VAT Registered' : ''}` } : null,
                                    vatRegistered && vatNumber ? { label: 'VAT No.', value: vatNumber } : null,
                                    { label: 'Owner', value: ownerName },
                                    { label: 'Login Email', value: ownerEmail },
                                    logoFile ? { label: 'Logo', value: logoFile.name } : null,
                                ].filter(Boolean).map((row) => (
                                    <div key={row!.label} className="px-4 py-3 flex justify-between gap-4">
                                        <span className="text-gray-500 shrink-0">{row!.label}</span>
                                        <span className="font-medium text-gray-900 text-right break-all">{row!.value}</span>
                                    </div>
                                ))}
                            </div>

                            {globalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                                    <X size={15} className="shrink-0 mt-0.5" />{globalError}
                                </div>
                            )}
                            <p className="text-xs text-gray-400 text-center">
                                By creating an account you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className={`px-6 py-4 bg-gray-50 border-t border-gray-100 flex ${step > 1 ? 'justify-between' : 'justify-end'}`}>
                        {step > 1 && (
                            <button onClick={handleBack} disabled={isSubmitting}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50">
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}
                        {step < 4 ? (
                            <button onClick={handleNext}
                                    className="flex items-center gap-1.5 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:scale-[0.98] transition">
                                Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={isSubmitting}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-[#E85D04] text-white text-sm font-semibold rounded-xl hover:bg-[#E85D04]/90 active:scale-[0.98] transition disabled:opacity-60">
                                {isSubmitting
                                    ? <><Loader2 size={16} className="animate-spin" /> Creating...</>
                                    : <><Check size={16} /> Create My Restaurant</>}
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
