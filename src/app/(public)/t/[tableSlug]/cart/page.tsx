'use client'

import { useCartStore, getCartItemKey } from '@/lib/stores/cart'
import { useHydratedStore } from '@/lib/stores/useHydratedStore'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, Plus, Minus, Pencil } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect, useRef, use } from 'react'
import { placeOrder } from '@/app/(public)/t/[tableSlug]/checkout/actions'
import { toast } from 'react-hot-toast'
import { playVoice } from '@/lib/voice'
import OrderConfirmModal from '@/components/customer/OrderConfirmModal'
import ItemDetailView from '@/components/customer/ItemDetailView'
import { createClient } from '@/lib/supabase/client'
import type { MenuItem, CartItemModifier } from '@/types/database'

export default function CartPage(props: { params: Promise<{ tableSlug: string }> }) {
    const params = use(props.params)
    const router = useRouter()
    const items = useHydratedStore(useCartStore, (s) => s.items) || []
    const sessionId = useHydratedStore(useCartStore, (s) => s.sessionId)
    const storeSlug = useHydratedStore(useCartStore, (s) => s.restaurantSlug)
    const restaurantId = useHydratedStore(useCartStore, (s) => s.restaurantId)
    const updateQuantity = useCartStore((s) => s.updateQuantity)
    const removeItem = useCartStore((s) => s.removeItem)
    const addItem = useCartStore((s) => s.addItem)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [showNoteModal, setShowNoteModal] = useState(false)
    const [globalNote, setGlobalNote] = useState('')
    const isSubmittingRef = useRef(false)

    // Load full menu items to allow editing via bottom sheet
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [activeEditItem, setActiveEditItem] = useState<MenuItem | null>(null)
    const [activeEditCartKey, setActiveEditCartKey] = useState<string | null>(null)

    useEffect(() => {
        if (!restaurantId) return
        const supabase = createClient()
        const loadMenu = async () => {
            const { data } = await supabase
                .from('menu_items')
                .select('*, modifier_groups(*, modifiers(*)), menu_categories(name)')
                .eq('restaurant_id', restaurantId)
                .eq('is_available', true)
            if (data) {
                setMenuItems(data as any[])
            }
        }
        loadMenu()
    }, [restaurantId])

    const storeIdempotencyKey = useHydratedStore(useCartStore, (s) => s.idempotencyKey)
    const [fallbackKey] = useState(() => `fallback-cart-${Date.now()}`)
    const idempotencyKey = storeIdempotencyKey || fallbackKey

    const count = items.reduce((acc, item) => acc + item.quantity, 0)
    const totalAmount = items.reduce((total, item) => {
        const modifierTotal = (item.modifiers || []).reduce((sum, mod) => sum + mod.priceAdjustment, 0)
        return total + (item.price + modifierTotal) * item.quantity
    }, 0)

    const slug = storeSlug || params.tableSlug || 'menu'

    const handleIncrement = (cartKey: string, currentQty: number) => {
        updateQuantity(cartKey, currentQty + 1)
    }

    const handleDecrement = (cartKey: string, currentQty: number) => {
        if (currentQty > 1) {
            updateQuantity(cartKey, currentQty - 1)
        } else {
            removeItem(cartKey)
        }
    }

    const handleEditCartItem = (cartItem: any) => {
        const matchedItem = menuItems.find(m => m.id === cartItem.menuItemId)
        if (matchedItem) {
            setActiveEditItem(matchedItem)
            setActiveEditCartKey(getCartItemKey(cartItem))
        } else {
            toast.error("Unable to edit this item right now.")
        }
    }

    const handleSaveEdit = (newModifiers: CartItemModifier[], newQty: number, newRequest: string) => {
        if (!activeEditCartKey || !activeEditItem) return

        const oldKey = activeEditCartKey
        const newKey = getCartItemKey({ menuItemId: activeEditItem.id, modifiers: newModifiers })

        if (oldKey === newKey) {
            // Options are the same, just update quantity and special request note
            updateQuantity(oldKey, newQty)
            useCartStore.getState().updateSpecialRequest(oldKey, newRequest)
        } else {
            // Options changed: remove old item, add new item
            removeItem(oldKey)
            const existing = items.find(i => getCartItemKey(i) === newKey)
            addItem({
                menuItemId: activeEditItem.id,
                name: activeEditItem.name,
                price: activeEditItem.price,
                imageUrl: activeEditItem.image_url || undefined,
                modifiers: newModifiers,
            })
            updateQuantity(newKey, existing ? existing.quantity + newQty : newQty)
            useCartStore.getState().updateSpecialRequest(newKey, newRequest)
        }

        setActiveEditItem(null)
        setActiveEditCartKey(null)
    }

    const handlePlaceOrder = async () => {
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

        const cartItems = useCartStore.getState().items
        const clearCart = useCartStore.getState().clearCart

        const res = await placeOrder(
            sessionId,
            slug,
            cartItems,
            globalNote.trim() || undefined,
            undefined,
            undefined,
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
            setShowConfirm(false)
        } else if (res.orderId) {
            toast.success("Order placed successfully!")
            playVoice('customer_order_placed')
            clearCart()
            router.push(`/t/${slug}/order/${res.orderId}`)
        }
    }

    // Empty cart state
    if (count === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <header className="bg-white border-b border-gray-100 sticky top-0 z-20 px-4 py-3.5">
                    <div className="max-w-2xl mx-auto flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center active:scale-95 transition shadow-sm"
                        >
                            <ChevronLeft size={18} className="text-gray-600" />
                        </button>
                        <h1 className="text-base font-bold text-gray-900">Your Cart</h1>
                    </div>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <span className="text-2xl">🛒</span>
                    </div>
                    <h2 className="text-base font-bold text-gray-950 mb-1">Your cart is empty</h2>
                    <p className="text-xs text-gray-400 font-semibold mb-6">
                        Browse the menu and add some delicious items!
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="bg-[var(--color-primary)] text-white font-bold text-xs px-5 py-3 rounded-xl active:scale-95 transition shadow-md shadow-orange-600/10"
                    >
                        Browse Menu
                    </button>
                </div>
            </div>
        )
    }

    const editTargetItem = activeEditCartKey ? items.find(i => getCartItemKey(i) === activeEditCartKey) : null

    return (
        <div className="min-h-screen bg-gray-50 pb-36 text-gray-950 font-sans flex flex-col justify-between">
            <div>
                {/* Header */}
                <header className="bg-white border-b border-gray-100 sticky top-0 z-20 px-4 py-3">
                    <div className="max-w-2xl mx-auto flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center active:scale-95 transition shadow-sm"
                        >
                            <ChevronLeft size={18} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-base font-bold text-gray-950 leading-none">Your Cart</h1>
                            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                                Review and confirm your order
                            </p>
                        </div>
                    </div>
                </header>

                {/* Cart Items */}
                <div className="max-w-2xl mx-auto px-4 pt-4">
                    <div className="space-y-3">
                        {items.map((item) => {
                            const cartKey = getCartItemKey(item)
                            const modifierTotal = (item.modifiers || []).reduce((sum, mod) => sum + mod.priceAdjustment, 0)
                            const unitPrice = item.price + modifierTotal
                            const lineTotal = unitPrice * item.quantity

                            // Build options descriptive label (e.g. "4 Small Chicken Pizza")
                            const modifierNames = (item.modifiers || []).map(m => m.name).join(', ')
                            const optionsLabel = modifierNames 
                                ? `${item.quantity} ${modifierNames} ${item.name}`
                                : `${item.quantity} ${item.name}`

                            return (
                                <div
                                    key={cartKey}
                                    className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 items-start shadow-sm"
                                >
                                    {/* Product Image */}
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                        {item.imageUrl ? (
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                                sizes="64px"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xl">🍽️</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Panel */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-gray-950 leading-tight">
                                            {item.name}
                                        </h3>
                                        <p className="text-[11px] text-gray-400 font-semibold mt-0.5 leading-snug">
                                            {optionsLabel}
                                        </p>
                                        <button
                                            onClick={() => handleEditCartItem(item)}
                                            className="text-gray-400 hover:text-gray-600 font-bold text-[10px] flex items-center gap-1.5 mt-2.5 transition active:scale-95"
                                        >
                                            <Pencil size={11} /> Edit Item
                                        </button>
                                    </div>

                                    {/* Controls & Price */}
                                    <div className="flex flex-col items-end justify-between min-h-[72px] shrink-0">
                                        {/* Quantity control */}
                                        <div className="flex items-center gap-2.5 border border-red-500 rounded-xl px-2 py-1 text-red-500 font-bold text-xs bg-white shrink-0">
                                            <button 
                                                onClick={() => handleDecrement(cartKey, item.quantity)} 
                                                className="active:scale-90 transition hover:opacity-80"
                                            >
                                                <Minus size={11} strokeWidth={3} />
                                            </button>
                                            <span className="min-w-[12px] text-center tabular-nums text-xs font-black">
                                                {item.quantity}
                                            </span>
                                            <button 
                                                onClick={() => handleIncrement(cartKey, item.quantity)} 
                                                className="active:scale-90 transition hover:opacity-80"
                                            >
                                                <Plus size={11} strokeWidth={3} />
                                            </button>
                                        </div>

                                        {/* Price */}
                                        <span className="text-xs font-black text-gray-950 mt-2">
                                            {formatCurrency(lineTotal)}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Action Buttons below list */}
                    <div className="flex gap-3 mt-5">
                        <button
                            onClick={() => router.back()}
                            className="flex-1 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition active:scale-95"
                        >
                            <Plus size={13} className="stroke-[3px]" /> Add Items
                        </button>
                        <button
                            onClick={() => setShowNoteModal(true)}
                            className="flex-1 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition active:scale-95"
                        >
                            ✍️ Cooking Requests
                        </button>
                    </div>

                    {/* Order Summary Total */}
                    <div className="flex justify-between items-center py-4 border-t border-b border-gray-150 my-6 px-1">
                        <span className="text-sm font-bold text-gray-800">Total</span>
                        <span className="text-sm font-black text-gray-950">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </div>

            {/* Sticky Orange Footer PLACE ORDER Bar */}
            <div
                className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-150 px-4 py-4"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
                <div className="max-w-2xl mx-auto flex flex-col">
                    <div>
                        <p className="text-xs font-bold text-gray-900 leading-none">Almost There,</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            You're all set to place your order
                        </p>
                    </div>
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={isSubmitting || !sessionId}
                        className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-bold py-3.5 rounded-xl text-center text-sm shadow-md active:scale-95 transition-all mt-3"
                    >
                        PLACE ORDER
                    </button>
                </div>
            </div>

            {/* Global Cooking Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-gray-100 shadow-xl flex flex-col gap-4 animate-scale-in">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Add Cooking Requests</h3>
                            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                                Specify instructions for the chef (applies to the whole order)
                            </p>
                        </div>
                        <textarea
                            value={globalNote}
                            onChange={(e) => setGlobalNote(e.target.value)}
                            placeholder="e.g. Make it extra spicy, bring together with drinks..."
                            className="w-full text-xs border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[var(--color-primary)] min-h-[90px] resize-none"
                        />
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setShowNoteModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs active:scale-95 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowNoteModal(false)}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs active:scale-95 transition"
                            >
                                Save Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && (
                <OrderConfirmModal
                    itemCount={count}
                    totalAmount={totalAmount}
                    isPlacing={isSubmitting}
                    onConfirm={handlePlaceOrder}
                    onCancel={() => setShowConfirm(false)}
                />
            )}

            {/* Item Edit sheet */}
            {activeEditItem && editTargetItem && (
                <ItemDetailView
                    item={activeEditItem}
                    comboItems={[]}
                    menuItems={menuItems}
                    sessionId={sessionId || undefined}
                    restaurantSlug={slug}
                    restaurantId={restaurantId || undefined}
                    onClose={() => {
                        setActiveEditItem(null)
                        setActiveEditCartKey(null)
                    }}
                    initialQuantity={editTargetItem.quantity}
                    initialCookingRequest={editTargetItem.specialRequest}
                    initialModifiers={editTargetItem.modifiers}
                    onSaveEdit={handleSaveEdit}
                />
            )}
        </div>
    )
}
