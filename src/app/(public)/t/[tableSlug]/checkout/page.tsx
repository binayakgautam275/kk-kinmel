'use client'

import { useCartStore, getCartItemKey } from '@/lib/stores/cart'
import { useHydratedStore } from '@/lib/stores/useHydratedStore'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { placeOrder } from './actions'
import { useState, useRef } from 'react'
import { ArrowLeft, Trash2, Plus, Minus, Loader2 } from 'lucide-react'
import PromoCodeInput from '@/components/customer/PromoCodeInput'
import LoyaltyPanel from '@/components/customer/LoyaltyPanel'
import SplitBillModal from '@/components/customer/SplitBillModal'
import { useFeatures } from '@/lib/contexts/FeatureContext'
import { useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function CheckoutPage() {
    const params = useParams<{ tableSlug: string }>()
    const features = useFeatures()
    const items = useHydratedStore(useCartStore, (s) => s.items)
    const sessionId = useHydratedStore(useCartStore, (s) => s.sessionId)
    const restaurantSlug = useHydratedStore(useCartStore, (s) => s.restaurantSlug)
    const restaurantId = useHydratedStore(useCartStore, (s) => s.restaurantId)
    const promoCode = useHydratedStore(useCartStore, (s) => s.promoCode)
    const promoDiscount = useHydratedStore(useCartStore, (s) => s.promoDiscount)
    const loyaltyMember = useHydratedStore(useCartStore, (s) => s.loyaltyMember)
    const loyaltyDiscount = useHydratedStore(useCartStore, (s) => s.loyaltyDiscount)
    const removeItem = useCartStore((s) => s.removeItem)
    const updateQuantity = useCartStore((s) => s.updateQuantity)
    const totalAmount = useCartStore((s) => s.totalAmount)
    const totalItems = useCartStore((s) => s.totalItems)
    const finalTotal = useCartStore((s) => s.finalTotal)
    const clearCart = useCartStore((s) => s.clearCart)
    const setPromo = useCartStore((s) => s.setPromo)
    const setLoyaltyMember = useCartStore((s) => s.setLoyaltyMember)
    const setLoyaltyDiscount = useCartStore((s) => s.setLoyaltyDiscount)
    const [note, setNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const isSubmittingRef = useRef(false)
    const [showSplit, setShowSplit] = useState(false)
    const router = useRouter()

    // Stable idempotency key for this checkout attempt. Sent with the order so a
    // double-tap / retry / second tab can't create a duplicate order in the
    // kitchen — the server returns the already-placed order instead.
    const idempotencyKey = useHydratedStore(useCartStore, (s) => s.idempotencyKey) || `fallback-cr-${Date.now()}`

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-gray-400 mb-4 flex justify-center">
                        <ShoppingBagIcon className="w-16 h-16" />
                    </div>
                    <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
                    <button
                        onClick={() => router.back()}
                        className="text-[var(--color-primary)] font-medium"
                    >
                        Go back to menu
                    </button>
                </div>
            </div>
        )
    }

    const handleCheckout = async () => {
        // Re-entrancy guard: the disabled state only applies on the next render,
        // so a rapid double-tap could otherwise fire two orders before then.
        if (isSubmittingRef.current) {
            toast.error("Hold tight! We are already sending your order to the kitchen.")
            return
        }

        if (!sessionId) {
            toast.error("No active session found. Please scan the QR code again.")
            return
        }

        isSubmittingRef.current = true
        setIsSubmitting(true)

        const res = await placeOrder(
            sessionId,
            restaurantSlug || params.tableSlug,
            items,
            note,
            promoCode?.code || null,
            loyaltyMember?.id || null,
            idempotencyKey
        )

        if (res.error) {
            if (res.error.includes('OUT_OF_STOCK')) {
                toast.error("Sorry, an item just went out of stock while you were ordering!", { duration: 5000 })
            } else {
                toast.error(res.error)
            }
            isSubmittingRef.current = false
            setIsSubmitting(false)
        } else if (res.orderId) {
            toast.success("Order placed successfully!")
            clearCart()
            router.push(`/t/${params.tableSlug}/order/${res.orderId}`)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20 flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600 rounded-full active:bg-gray-100">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Checkout</h1>
            </header>

            <main className="max-w-xl mx-auto px-4 mt-6">
                <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="font-semibold text-gray-700">Order Summary ({totalItems()} items)</h2>
                    </div>

                    <ul className="divide-y divide-gray-100">
                        {items.map((item) => {
                            const key = getCartItemKey(item)
                            const modTotal = (item.modifiers || []).reduce((s, m) => s + m.priceAdjustment, 0)
                            return (
                            <li key={key} className="p-4 flex gap-4 bg-white">
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {item.modifiers.map(m => m.name).join(', ')}
                                        </p>
                                    )}
                                    <div className="text-[var(--color-primary)] font-medium mt-1">
                                        {formatCurrency((item.price + modTotal) * item.quantity)}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end justify-between">
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-200">
                                        <button
                                            onClick={() => item.quantity === 1 ? removeItem(key) : updateQuantity(key, item.quantity - 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 active:bg-gray-100"
                                        >
                                            {item.quantity === 1 ? <Trash2 size={16} className="text-red-500" /> : <Minus size={16} />}
                                        </button>
                                        <span className="font-medium w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(key, item.quantity + 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary)] shadow-sm text-white"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                            )
                        })}
                    </ul>
                </div>

                {/* Note */}
                <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 p-4 mb-6">
                    <label htmlFor="note" className="block font-semibold text-gray-700 mb-2">Add a note to kitchen</label>
                    <textarea
                        id="note"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                        placeholder="E.g. No onions, extra spicy..."
                    />
                </div>

                {/* Promo Code — shown when promos OR loyalty is enabled */}
                {restaurantId && (features.promosEnabled !== false) && (
                    <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 p-4 mb-6">
                        <PromoCodeInput
                            restaurantId={restaurantId}
                            subtotal={totalAmount()}
                            onApply={(promo, discount) => setPromo(promo, discount)}
                            onRemove={() => setPromo(null, 0)}
                            appliedPromo={promoCode}
                        />
                    </div>
                )}

                {/* Loyalty — gated by feature flag */}
                {restaurantId && features.loyaltyEnabled && (
                    <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 p-4 mb-6">
                        <LoyaltyPanel
                            restaurantId={restaurantId}
                            onMemberSet={setLoyaltyMember}
                            onRedeemDiscount={setLoyaltyDiscount}
                            activeMember={loyaltyMember}
                        />
                    </div>
                )}

            </main>

            {/* Persistent Bottom Checkout Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-white border-t border-gray-200">
                <div className="max-w-xl mx-auto">
                    <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(totalAmount())}</span>
                        </div>
                        {promoDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Promo ({promoCode?.code})</span>
                                <span>-{formatCurrency(promoDiscount)}</span>
                            </div>
                        )}
                        {loyaltyDiscount > 0 && (
                            <div className="flex justify-between text-sm text-indigo-600">
                                <span>Loyalty Reward</span>
                                <span>-{formatCurrency(loyaltyDiscount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                            <span className="text-gray-600 font-medium">Total to pay</span>
                            <span className="text-2xl font-bold text-gray-900">{formatCurrency(finalTotal())}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-3">
                        {features.splitBillingEnabled && (
                            <button
                                onClick={() => setShowSplit(true)}
                                disabled={!sessionId}
                                className="flex-1 border border-gray-300 text-gray-700 font-medium rounded-xl py-3 text-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                                Split Bill
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={isSubmitting}
                        className="w-full bg-[var(--color-primary)] text-white font-medium rounded-xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-[var(--color-primary)]/20"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="animate-spin" size={20} /> Sending to Kitchen...</>
                        ) : (
                            'Place Order'
                        )}
                    </button>
                </div>
            </div>
            {showSplit && sessionId && (
                <SplitBillModal
                    sessionId={sessionId}
                    totalAmount={finalTotal()}
                    onClose={() => setShowSplit(false)}
                />
            )}
        </div>
    )
}

function ShoppingBagIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    )
}
