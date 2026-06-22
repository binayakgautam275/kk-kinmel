// lib/stores/cart.ts
// Zustand cart store with localStorage persistence and optimistic updates
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CartItemModifier, PromoCode, LoyaltyMember } from '@/types/database'

// Safety cap — prevents malicious users from adding absurd quantities
// that could overflow NUMERIC(10,2) in the database
const MAX_QUANTITY_PER_ITEM = 20

// Generate a unique key for a cart item based on its ID + selected modifiers
// This ensures "Latte + Oat Milk" and "Latte + Almond Milk" are separate line items
export function getCartItemKey(item: { menuItemId: string; modifiers?: CartItemModifier[]; variationId?: string }): string {
    const modKey = (item.modifiers || [])
        .map((m) => m.modifierId)
        .sort()
        .join(',')
    const varKey = item.variationId || ''
    return `${item.menuItemId}::${modKey}::${varKey}`
}

interface CartState {
    items: CartItem[]
    sessionId: string | null
    restaurantSlug: string | null
    restaurantId: string | null

    // Promo & loyalty
    promoCode: PromoCode | null
    promoDiscount: number
    loyaltyMember: LoyaltyMember | null
    loyaltyDiscount: number

    // Actions
    setSession: (sessionId: string, restaurantSlug: string, restaurantId?: string) => void
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (cartItemKey: string) => void
    updateQuantity: (cartItemKey: string, quantity: number) => void
    updateSpecialRequest: (cartItemKey: string, request: string) => void
    setPromo: (promo: PromoCode | null, discount: number) => void
    setLoyaltyMember: (member: LoyaltyMember | null) => void
    setLoyaltyDiscount: (discount: number) => void
    clearCart: () => void

    // Computed
    totalAmount: () => number
    totalItems: () => number
    finalTotal: () => number

    // Idempotency
    idempotencyKey: string
    regenerateIdempotencyKey: () => void
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            sessionId: null,
            restaurantSlug: null,
            restaurantId: null,
            promoCode: null,
            promoDiscount: 0,
            loyaltyMember: null,
            loyaltyDiscount: 0,
            idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`,

            regenerateIdempotencyKey: () =>
                set({
                    idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`
                }),

            setSession: (sessionId, restaurantSlug, restaurantId) =>
                set((state) => {
                    // If switching to a different session, clear the cart
                    const isSameSession = state.sessionId === sessionId
                    if (!isSameSession && state.items.length > 0) {
                        return {
                            sessionId,
                            restaurantSlug,
                            restaurantId: restaurantId || null,
                            items: [],
                            promoCode: null,
                            promoDiscount: 0,
                            loyaltyMember: null,
                            loyaltyDiscount: 0,
                        }
                    }
                    return { sessionId, restaurantSlug, restaurantId: restaurantId || null }
                }),

            addItem: (item) =>
                set((state) => {
                    const newIdempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`
                    // Build a unique key from menuItemId + sorted modifier IDs
                    // so "Latte + Oat Milk" and "Latte + Almond Milk" are separate items
                    const itemKey = getCartItemKey(item)
                    const existing = state.items.find(
                        (i) => getCartItemKey(i) === itemKey
                    )
                    if (existing) {
                        return {
                            idempotencyKey: newIdempotencyKey,
                            items: state.items.map((i) =>
                                getCartItemKey(i) === itemKey
                                    ? { ...i, quantity: Math.min(i.quantity + 1, MAX_QUANTITY_PER_ITEM) }
                                    : i
                            ),
                        }
                    }
                    return { idempotencyKey: newIdempotencyKey, items: [...state.items, { ...item, quantity: 1 }] }
                }),

            removeItem: (cartItemKey) =>
                set((state) => ({
                    idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    items: state.items.filter((i) => getCartItemKey(i) !== cartItemKey),
                })),

            updateQuantity: (cartItemKey, quantity) =>
                set((state) => {
                    const newIdempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`
                    if (quantity <= 0) {
                        return {
                            idempotencyKey: newIdempotencyKey,
                            items: state.items.filter((i) => getCartItemKey(i) !== cartItemKey),
                        }
                    }
                    const capped = Math.min(quantity, MAX_QUANTITY_PER_ITEM)
                    return {
                        idempotencyKey: newIdempotencyKey,
                        items: state.items.map((i) =>
                            getCartItemKey(i) === cartItemKey ? { ...i, quantity: capped } : i
                        ),
                    }
                }),

            updateSpecialRequest: (cartItemKey, request) =>
                set((state) => ({
                    idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    items: state.items.map((i) =>
                        getCartItemKey(i) === cartItemKey
                            ? { ...i, specialRequest: request }
                            : i
                    ),
                })),

            clearCart: () => set({
                items: [],
                sessionId: null,
                restaurantSlug: null,
                restaurantId: null,
                promoCode: null,
                promoDiscount: 0,
                loyaltyMember: null,
                loyaltyDiscount: 0,
                idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            }),

            setPromo: (promo, discount) =>
                set({ promoCode: promo, promoDiscount: discount }),

            setLoyaltyMember: (member) =>
                set({ loyaltyMember: member }),

            setLoyaltyDiscount: (discount) =>
                set({ loyaltyDiscount: discount }),

            totalAmount: () =>
                get().items.reduce(
                    (total, item) => {
                        const modifierTotal = (item.modifiers || []).reduce(
                            (sum, mod) => sum + mod.priceAdjustment, 0
                        )
                        return total + (item.price + modifierTotal) * item.quantity
                    },
                    0
                ),

            totalItems: () =>
                get().items.reduce((total, item) => total + item.quantity, 0),

            finalTotal: () => {
                const subtotal = get().totalAmount()
                const promoDisc = get().promoDiscount
                const loyaltyDisc = get().loyaltyDiscount
                return Math.max(0, subtotal - promoDisc - loyaltyDisc)
            },
        }),
        {
            name: 'srms-cart',
            // Only persist items and session info
            partialize: (state) => ({
                items: state.items,
                sessionId: state.sessionId,
                restaurantSlug: state.restaurantSlug,
                restaurantId: state.restaurantId,
                promoCode: state.promoCode,
                promoDiscount: state.promoDiscount,
                loyaltyMember: state.loyaltyMember,
                loyaltyDiscount: state.loyaltyDiscount,
                idempotencyKey: state.idempotencyKey,
            }),
        }
    )
)
