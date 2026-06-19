'use client'

import { useState } from 'react'
import {
    lookupLoyaltyMember,
    signUpLoyalty,
    getLoyaltyConfig,
    redeemLoyaltyPoints,
} from '@/app/api/loyalty/actions'
import { formatCurrency } from '@/lib/utils'
import type { LoyaltyMember, LoyaltyConfig } from '@/types/database'
import { toast } from 'react-hot-toast'

interface LoyaltyPanelProps {
    restaurantId: string
    onMemberSet: (member: LoyaltyMember | null) => void
    onRedeemDiscount: (discount: number) => void
    activeMember?: LoyaltyMember | null
}

const TIER_COLORS: Record<string, string> = {
    bronze: 'bg-amber-100 text-amber-800',
    silver: 'bg-gray-100 text-gray-700',
    gold: 'bg-yellow-100 text-yellow-800',
    platinum: 'bg-purple-100 text-purple-800',
}

export default function LoyaltyPanel({
    restaurantId,
    onMemberSet,
    onRedeemDiscount,
    activeMember,
}: LoyaltyPanelProps) {
    const [phone, setPhone] = useState('')
    const [mode, setMode] = useState<'lookup' | 'signup'>('lookup')
    const [displayName, setDisplayName] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [config, setConfig] = useState<LoyaltyConfig | null>(null)
    const [signupBonus, setSignupBonus] = useState<number | null>(null)

    async function handleLookup() {
        if (!phone.trim()) return
        setLoading(true)

        const result = await lookupLoyaltyMember(restaurantId, phone)
        if (result.member) {
            onMemberSet(result.member)
            const cfg = await getLoyaltyConfig(restaurantId)
            setConfig(cfg)
        } else {
            toast.error(result.error || 'Not found.')
        }
        setLoading(false)
    }

    async function handleSignup() {
        if (!phone.trim()) return
        setLoading(true)

        const result = await signUpLoyalty(restaurantId, phone, displayName, email)
        if (result.member) {
            onMemberSet(result.member)
            setSignupBonus(result.bonusPoints || null)
            const cfg = await getLoyaltyConfig(restaurantId)
            setConfig(cfg)
            setMode('lookup')
        } else {
            toast.error(result.error || 'Signup failed.')
        }
        setLoading(false)
    }

    async function handleRedeem() {
        if (!activeMember) return
        setLoading(true)

        const result = await redeemLoyaltyPoints(activeMember.id, restaurantId)
        if (result.discount > 0) {
            onRedeemDiscount(result.discount)
            toast.success(`${formatCurrency(result.discount)} discount applied!`)
            // Refresh member data
            const updated = await lookupLoyaltyMember(restaurantId, activeMember.phone || '')
            if (updated.member) onMemberSet(updated.member)
        } else {
            toast.error(result.error || 'Cannot redeem.')
        }
        setLoading(false)
    }

    function handleRemove() {
        onMemberSet(null)
        setPhone('')
        setConfig(null)
        setSignupBonus(null)
    }

    // If member is already linked
    if (activeMember) {
        const tierClass = TIER_COLORS[activeMember.tier] || 'bg-gray-100 text-gray-700'
        const canRedeem = config && activeMember.points_balance >= (config.redemption_threshold || Infinity)

        return (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-indigo-900">
                                {activeMember.display_name || activeMember.phone}
                            </p>
                            <span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${tierClass}`}>
                                {activeMember.tier}
                            </span>
                        </div>
                    </div>
                    <button onClick={handleRemove} className="text-xs text-gray-500 hover:text-gray-700">
                        Remove
                    </button>
                </div>

                {signupBonus && (
                    <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                        🎉 Welcome bonus: +{signupBonus} points!
                    </p>
                )}

                <div className="flex items-center justify-between text-sm">
                    <span className="text-indigo-700">
                        ⭐ {activeMember.points_balance} points
                    </span>
                    {canRedeem && config && (
                        <button
                            onClick={handleRedeem}
                            disabled={loading}
                            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Redeem {config.redemption_threshold} pts → {formatCurrency(config.redemption_value)} off
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Lookup / signup form
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Loyalty Rewards</label>
                <button
                    onClick={() => {
                        setMode(mode === 'lookup' ? 'signup' : 'lookup')
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                    {mode === 'lookup' ? 'New member? Sign up' : 'Already a member?'}
                </button>
            </div>

            <div className="flex gap-2">
                <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                        setPhone(e.target.value)
                    }}
                    placeholder="Phone number"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={loading}
                />
                {mode === 'lookup' && (
                    <button
                        onClick={handleLookup}
                        disabled={loading || !phone.trim()}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? '...' : 'Look Up'}
                    </button>
                )}
            </div>

            {mode === 'signup' && (
                <>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Name (optional)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email (optional)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                        onClick={handleSignup}
                        disabled={loading || !phone.trim()}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Signing up...' : 'Join Rewards Program'}
                    </button>
                </>
            )}
        </div>
    )
}
