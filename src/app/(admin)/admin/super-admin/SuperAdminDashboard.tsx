'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ShoppingBag, Crown, Ban, CheckCircle, Loader2, ChevronDown, Plus, X, Store, UserRound, Mail, KeyRound, Phone, MapPin, Check, CreditCard, AlertTriangle } from 'lucide-react'
import { createTenantWithOwner, suspendRestaurant, updateSubscriptionTier, sendPasswordResetEmail, updateOwnerContact, recordSubscriptionPayment } from './actions'
import { toast } from 'react-hot-toast'

interface Restaurant {
    id: string
    name: string
    slug: string
    is_active: boolean
    is_suspended: boolean
    subscription_tier: string
    subscription_status: string
    subscription_expires_at: string | null
    max_staff: number
    max_menu_items: number
    created_at: string
    users?: { email: string } | null
}

interface SaasMetrics {
    totalRestaurants: number
    activeRestaurants: number
    totalOrders: number
    tierBreakdown: Record<string, number>
}

const TIER_COLORS: Record<string, string> = {
    free:       'bg-gray-100 text-gray-700 border-gray-200',
    basic:      'bg-blue-100 text-blue-700 border-blue-200',
    pro:        'bg-purple-100 text-purple-700 border-purple-200',
    enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default function SuperAdminDashboard({
    restaurants,
    metrics,
}: {
    restaurants: Restaurant[]
    metrics: SaasMetrics
}) {
    const [items, setItems] = useState(restaurants)
    const [loading, setLoading] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isCreatingTenant, setIsCreatingTenant] = useState(false)
    const [manageOwnerModal, setManageOwnerModal] = useState<{
        isOpen: boolean
        restaurant: Restaurant | null
        action: 'password' | 'contact'
        email?: string
        phone?: string
    }>({
        isOpen: false,
        restaurant: null,
        action: 'password',
        email: undefined,
        phone: undefined,
    })
    const [isUpdatingOwner, setIsUpdatingOwner] = useState(false)
    const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; restaurant: Restaurant | null }>({ isOpen: false, restaurant: null })
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', reference: '', notes: '' })
    const [isRecordingPayment, setIsRecordingPayment] = useState(false)
    const [createForm, setCreateForm] = useState({
        restaurantName: '',
        restaurantSlug: '',
        ownerFullName: '',
        ownerEmail: '',
        ownerPassword: '',
        contactPhone: '',
        address: '',
        subscriptionTier: 'free' as 'free' | 'basic' | 'pro' | 'enterprise',
    })
    const router = useRouter()

    const handleCreateFormChange = (field: keyof typeof createForm, value: string) => {
        setCreateForm(prev => {
            if (field === 'restaurantName') {
                const nextName = value
                const previousGeneratedSlug = prev.restaurantName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                const generatedSlug = nextName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')

                return {
                    ...prev,
                    restaurantName: nextName,
                    restaurantSlug: prev.restaurantSlug === '' || prev.restaurantSlug === previousGeneratedSlug
                        ? generatedSlug
                        : prev.restaurantSlug,
                }
            }

            if (field === 'restaurantSlug') {
                return {
                    ...prev,
                    restaurantSlug: value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]+/g, '-')
                        .replace(/--+/g, '-')
                        .replace(/^-+|-+$/g, ''),
                }
            }

            return { ...prev, [field]: value }
        })
    }

    const resetCreateForm = () => {
        setCreateForm({
            restaurantName: '',
            restaurantSlug: '',
            ownerFullName: '',
            ownerEmail: '',
            ownerPassword: '',
            contactPhone: '',
            address: '',
            subscriptionTier: 'free',
        })
    }

    const handleCreateTenant = async () => {
        if (!createForm.restaurantName || !createForm.ownerFullName || !createForm.ownerEmail || !createForm.ownerPassword) {
            toast.error('Complete the required restaurant and owner fields')
            return
        }

        setIsCreatingTenant(true)
        const result = await createTenantWithOwner(createForm)
        setIsCreatingTenant(false)

        if (!result.success || !result.restaurant) {
            toast.error(result.error || 'Failed to create client')
            return
        }

        setItems(prev => [result.restaurant, ...prev])
        resetCreateForm()
        setIsCreateModalOpen(false)
        toast.success('Client created with owner account and default settings')
        router.refresh()
    }

    const handleSuspend = async (id: string, suspend: boolean) => {
        setLoading(id)
        const res = await suspendRestaurant(id, suspend)
        if (res.success) {
            setItems(prev => prev.map(r => r.id === id ? { ...r, is_suspended: suspend } : r))
            toast.success(suspend ? 'Restaurant suspended' : 'Restaurant reactivated')
        } else {
            toast.error(res.error || 'Failed')
        }
        setLoading(null)
    }

    const handleTierChange = async (id: string, tier: 'free' | 'basic' | 'pro' | 'enterprise') => {
        setLoading(id)
        const res = await updateSubscriptionTier(id, tier)
        if (res.success) {
            const limitsMap: Record<string, { max_staff: number; max_menu_items: number }> = {
                free: { max_staff: 3, max_menu_items: 20 },
                basic: { max_staff: 10, max_menu_items: 100 },
                pro: { max_staff: 50, max_menu_items: 500 },
                enterprise: { max_staff: 999, max_menu_items: 9999 },
            }
            setItems(prev =>
                prev.map(r =>
                    r.id === id
                        ? { ...r, subscription_tier: tier, ...limitsMap[tier] }
                        : r
                )
            )
            toast.success(`Tier changed to ${tier}`)
        } else {
            toast.error(res.error || 'Failed')
        }
        setLoading(null)
    }

    const handleOwnerAction = async () => {
        if (!manageOwnerModal.restaurant) return
        const restaurant = manageOwnerModal.restaurant
        const ownerEmail = restaurant.users?.email || ''

        setIsUpdatingOwner(true)

        if (manageOwnerModal.action === 'password') {
            const result = await sendPasswordResetEmail(restaurant.id, ownerEmail)
            if (result.success) {
                toast.success(result.message || 'Password reset email sent')
                setManageOwnerModal({ isOpen: false, restaurant: null, action: 'password' })
            } else {
                toast.error(result.error || 'Failed to send reset email')
            }
        } else if (manageOwnerModal.action === 'contact') {
            const updates: Record<string, string | undefined> = {}
            if (manageOwnerModal.email && manageOwnerModal.email !== ownerEmail) {
                updates.email = manageOwnerModal.email
            }
            if (manageOwnerModal.phone) {
                updates.phone = manageOwnerModal.phone
            }

            if (Object.keys(updates).length === 0) {
                toast.error('No changes to save')
                setIsUpdatingOwner(false)
                return
            }

            const result = await updateOwnerContact(restaurant.id, updates as Parameters<typeof updateOwnerContact>[1])
            if (result.success) {
                toast.success('Owner contact information updated')
                setManageOwnerModal({ isOpen: false, restaurant: null, action: 'password' })
            } else {
                toast.error(result.error || 'Failed to update contact')
            }
        }

        setIsUpdatingOwner(false)
    }

    const handleRecordPayment = async () => {
        if (!paymentModal.restaurant || !paymentForm.amount) return
        setIsRecordingPayment(true)
        const res = await recordSubscriptionPayment(
            paymentModal.restaurant.id,
            parseFloat(paymentForm.amount),
            paymentForm.method,
            paymentForm.reference,
            paymentForm.notes
        )
        if (res.success) {
            toast.success('Payment recorded. Subscription extended by 30 days.')
            setPaymentModal({ isOpen: false, restaurant: null })
            setPaymentForm({ amount: '', method: 'cash', reference: '', notes: '' })
        } else {
            toast.error(res.error || 'Failed to record payment')
        }
        setIsRecordingPayment(false)
    }

    // Restaurants expiring within 7 days. `now` is seeded once on mount so the
    // filter stays a pure computation across re-renders (React 19 purity).
    const [now] = useState(() => Date.now())
    const expiringSoon = useMemo(() => items.filter(r => {
        if (!r.subscription_expires_at) return false
        const diff = new Date(r.subscription_expires_at).getTime() - now
        return diff > 0 && diff < 7 * 24 * 3600 * 1000
    }), [items, now])

    return (
        <div className="space-y-5 md:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <Crown size={18} className="text-indigo-500" />
                        Tenant Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage subscriptions, tiers and restaurant accounts</p>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard icon={Building2}   bg="bg-indigo-50"  ic="text-indigo-600"  label="Total Tenants"  value={metrics.totalRestaurants} />
                <MetricCard icon={CheckCircle} bg="bg-emerald-50" ic="text-emerald-600" label="Active"         value={metrics.activeRestaurants} />
                <MetricCard icon={ShoppingBag} bg="bg-blue-50"    ic="text-blue-600"    label="Total Orders"   value={metrics.totalOrders} />
                <MetricCard icon={Crown}       bg="bg-purple-50"  ic="text-purple-600"  label="Pro+ Accounts"  value={(metrics.tierBreakdown.pro || 0) + (metrics.tierBreakdown.enterprise || 0)} />
            </div>

            {/* Tier Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Subscription Distribution</h3>
                <div className="flex gap-2 flex-wrap">
                    {Object.entries(metrics.tierBreakdown).map(([tier, count]) => (
                        <div key={tier} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${TIER_COLORS[tier] || 'bg-gray-100 text-gray-700'}`}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}: {count}
                        </div>
                    ))}
                </div>
            </div>

            {/* Expiring Soon Banner */}
            {expiringSoon.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800">Subscriptions expiring soon</p>
                        <ul className="mt-1 text-sm text-amber-700 space-y-0.5">
                            {expiringSoon.map(r => (
                                <li key={r.id}>
                                    <strong>{r.name}</strong> — expires {r.subscription_expires_at ? new Date(r.subscription_expires_at).toLocaleDateString('en-IN') : 'unknown'}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Restaurant List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">All Restaurants</h3>
                        <p className="text-sm text-gray-500 mt-1">Manage tenants, tiers, and suspension</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                    >
                        <Plus size={16} />
                        Add Client
                    </button>
                </div>

                <div className="divide-y divide-gray-100">
                    {items.map((restaurant) => (
                        <div
                            key={restaurant.id}
                            className={`p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 ${
                                restaurant.is_suspended ? 'bg-red-50/50' : ''
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-gray-900 truncate">{restaurant.name}</h4>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[restaurant.subscription_tier] || TIER_COLORS.free}`}>
                                        {(restaurant.subscription_tier || 'free').toUpperCase()}
                                    </span>
                                    {restaurant.is_suspended && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                            SUSPENDED
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {restaurant.users?.email || 'No owner'} •
                                    Staff: {restaurant.max_staff} • 
                                    Items: {restaurant.max_menu_items}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {/* Record Payment Button */}
                                <button
                                    onClick={() => {
                                        setPaymentModal({ isOpen: true, restaurant })
                                        setPaymentForm({ amount: '', method: 'cash', reference: '', notes: '' })
                                    }}
                                    disabled={loading === restaurant.id}
                                    className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition"
                                    title="Record subscription payment"
                                >
                                    <CreditCard size={14} />
                                </button>

                                {/* Manage Owner Button */}
                                <button
                                    onClick={() => {
                                        const ownerEmail = restaurant.users?.email || ''
                                        setManageOwnerModal({
                                            isOpen: true,
                                            restaurant,
                                            action: 'password',
                                            email: ownerEmail,
                                            phone: '',
                                        })
                                    }}
                                    disabled={loading === restaurant.id}
                                    className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition"
                                    title="Manage owner account"
                                >
                                    <UserRound size={14} />
                                </button>

                                {/* Tier Selector */}
                                <div className="relative">
                                    <select
                                        value={restaurant.subscription_tier || 'free'}
                                        onChange={(e) => handleTierChange(restaurant.id, e.target.value as 'free' | 'basic' | 'pro' | 'enterprise')}
                                        disabled={loading === restaurant.id}
                                        className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium disabled:opacity-50"
                                    >
                                        <option value="free">Free</option>
                                        <option value="basic">Basic</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>

                                {/* Suspend/Reactivate */}
                                <button
                                    onClick={() => handleSuspend(restaurant.id, !restaurant.is_suspended)}
                                    disabled={loading === restaurant.id}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 ${
                                        restaurant.is_suspended
                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                    }`}
                                >
                                    {loading === restaurant.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : restaurant.is_suspended ? (
                                        <><CheckCircle size={14} /> Reactivate</>
                                    ) : (
                                        <><Ban size={14} /> Suspend</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {items.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        <Building2 size={40} className="mx-auto mb-3" />
                        <p>No restaurants registered yet</p>
                    </div>
                )}
            </div>

            {manageOwnerModal.isOpen && manageOwnerModal.restaurant && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">Manage Owner</h3>
                                <p className="mt-1 text-sm text-gray-500">{manageOwnerModal.restaurant.name}</p>
                            </div>
                            <button
                                onClick={() => setManageOwnerModal({ isOpen: false, restaurant: null, action: 'password' })}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close manage owner modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-6 px-6 py-6">
                            <div className="flex gap-3 border-b border-gray-100 pb-4">
                                <button
                                    onClick={() => setManageOwnerModal(prev => ({ ...prev, action: 'password' }))}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                                        manageOwnerModal.action === 'password'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Reset Password
                                </button>
                                <button
                                    onClick={() => setManageOwnerModal(prev => ({ ...prev, action: 'contact' }))}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                                        manageOwnerModal.action === 'contact'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Update Contact
                                </button>
                            </div>

                            {manageOwnerModal.action === 'password' && (
                                <div className="space-y-4">
                                    <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                                        <p className="text-sm text-blue-900">
                                            A password reset email will be sent to <span className="font-semibold">{manageOwnerModal.restaurant.users?.email || 'owner'}</span>. They can use this link to set a new password.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleOwnerAction}
                                        disabled={isUpdatingOwner}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                                    >
                                        {isUpdatingOwner ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                        {isUpdatingOwner ? 'Sending...' : 'Send Reset Email'}
                                    </button>
                                </div>
                            )}

                            {manageOwnerModal.action === 'contact' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner Email</label>
                                        <input
                                            type="email"
                                            value={manageOwnerModal.email || ''}
                                            onChange={(e) => setManageOwnerModal(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={manageOwnerModal.phone || ''}
                                            onChange={(e) => setManageOwnerModal(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="+977-98XXXXXXXX"
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <button
                                        onClick={handleOwnerAction}
                                        disabled={isUpdatingOwner}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                                    >
                                        {isUpdatingOwner ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        {isUpdatingOwner ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4">
                            <button
                                onClick={() => setManageOwnerModal({ isOpen: false, restaurant: null, action: 'password' })}
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">Add Client</h3>
                                <p className="mt-1 text-sm text-gray-500">Create a new restaurant tenant, provision the manager account, and seed the default settings in one flow.</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (!isCreatingTenant) {
                                        setIsCreateModalOpen(false)
                                    }
                                }}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close add client modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
                            <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <Store size={16} className="text-primary" />
                                    Restaurant Profile
                                </div>

                                <Field label="Restaurant name *" icon={<Store size={16} />}>
                                    <input
                                        value={createForm.restaurantName}
                                        onChange={(e) => handleCreateFormChange('restaurantName', e.target.value)}
                                        placeholder="Hotel Himalaya"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </Field>

                                <Field label="Restaurant slug *" icon={<Store size={16} />}>
                                    <input
                                        value={createForm.restaurantSlug}
                                        onChange={(e) => handleCreateFormChange('restaurantSlug', e.target.value)}
                                        placeholder="hotel-himalaya"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </Field>

                                <Field label="Contact phone" icon={<Phone size={16} />}>
                                    <input
                                        value={createForm.contactPhone}
                                        onChange={(e) => handleCreateFormChange('contactPhone', e.target.value)}
                                        placeholder="+977-98XXXXXXXX"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </Field>

                                <Field label="Address" icon={<MapPin size={16} />}>
                                    <textarea
                                        value={createForm.address}
                                        onChange={(e) => handleCreateFormChange('address', e.target.value)}
                                        placeholder="Kathmandu, Nepal"
                                        rows={3}
                                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </Field>

                                <Field label="Subscription tier" icon={<Crown size={16} />}>
                                    <select
                                        value={createForm.subscriptionTier}
                                        onChange={(e) => handleCreateFormChange('subscriptionTier', e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="free">Free</option>
                                        <option value="basic">Basic</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </Field>
                            </div>

                            <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <UserRound size={16} className="text-primary" />
                                    Owner Account
                                </div>

                                <Field label="Owner full name *" icon={<UserRound size={16} />}>
                                    <input
                                        value={createForm.ownerFullName}
                                        onChange={(e) => handleCreateFormChange('ownerFullName', e.target.value)}
                                        placeholder="Aarav Shrestha"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </Field>

                                <Field label="Owner email *" icon={<Mail size={16} />}>
                                    <input
                                        type="email"
                                        value={createForm.ownerEmail}
                                        onChange={(e) => handleCreateFormChange('ownerEmail', e.target.value)}
                                        placeholder="owner@hotelhimalaya.com"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </Field>

                                <Field label="Temporary password *" icon={<KeyRound size={16} />}>
                                    <input
                                        type="password"
                                        value={createForm.ownerPassword}
                                        onChange={(e) => handleCreateFormChange('ownerPassword', e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </Field>

                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                    This creates the auth account, links the owner as the manager, and seeds default theme, tax, currency, and feature flags.
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-xs text-gray-500">The new owner can sign in immediately with the email and temporary password above.</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        if (!isCreatingTenant) {
                                            resetCreateForm()
                                            setIsCreateModalOpen(false)
                                        }
                                    }}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                    disabled={isCreatingTenant}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateTenant}
                                    disabled={isCreatingTenant}
                                    className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isCreatingTenant ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {isCreatingTenant ? 'Creating...' : 'Create Client'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {paymentModal.isOpen && paymentModal.restaurant && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-extrabold text-gray-900">Record Subscription Payment</h2>
                                <p className="text-sm text-gray-500 mt-0.5">{paymentModal.restaurant.name}</p>
                            </div>
                            <button onClick={() => setPaymentModal({ isOpen: false, restaurant: null })} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (Rs.)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="e.g. 1999"
                                    value={paymentForm.amount}
                                    onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                                <select
                                    value={paymentForm.method}
                                    onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="esewa">eSewa</option>
                                    <option value="khalti">Khalti</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="fonepay">FonePay</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference / Transaction ID</label>
                                <input
                                    type="text"
                                    placeholder="Optional — transaction code"
                                    value={paymentForm.reference}
                                    onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                                <input
                                    type="text"
                                    placeholder="Optional"
                                    value={paymentForm.notes}
                                    onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setPaymentModal({ isOpen: false, restaurant: null })}
                                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                disabled={isRecordingPayment || !paymentForm.amount}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                            >
                                {isRecordingPayment ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Record & Extend
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Field({
    label,
    icon,
    children,
}: {
    label: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-gray-400">{icon}</span>
                {label}
            </span>
            {children}
        </label>
    )
}

function MetricCard({
    icon: Icon,
    label,
    value,
    bg,
    ic,
}: {
    icon: React.ElementType
    label: string
    value: number
    bg: string
    ic: string
}) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={18} className={ic} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
                <p className="text-xl font-extrabold text-gray-900 leading-tight tabular-nums">{value.toLocaleString()}</p>
            </div>
        </div>
    )
}
