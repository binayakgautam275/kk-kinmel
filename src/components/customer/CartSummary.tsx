'use client'

import { useCartStore } from '@/lib/stores/cart'
import { useHydratedStore } from '@/lib/stores/useHydratedStore'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function CartSummary({ sessionId, tableSlug }: { sessionId?: string; tableSlug?: string }) {
    const items = useHydratedStore(useCartStore, (s) => s.items)
    const storeSlug = useHydratedStore(useCartStore, (s) => s.restaurantSlug)

    const count = items?.reduce((acc, item) => acc + item.quantity, 0) || 0
    const amount = items?.reduce((total, item) => {
        const modifierTotal = (item.modifiers || []).reduce((sum, mod) => sum + mod.priceAdjustment, 0)
        return total + (item.price + modifierTotal) * item.quantity
    }, 0) || 0
    const slug = tableSlug || storeSlug || 'menu'

    if (count === 0 || !sessionId) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="bg-gradient-to-t from-white/95 via-white/80 to-transparent pt-8 pb-5 px-4">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <Link
                        href={`/t/${slug}/checkout`}
                        className="group flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white active:scale-[0.97] transition-all duration-150"
                        style={{
                            background: 'var(--color-primary)',
                            boxShadow: '0 8px 32px -4px color-mix(in srgb, var(--color-primary) 40%, transparent), 0 2px 8px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                                    <ShoppingBag size={18} strokeWidth={2} />
                                </div>
                                <span className="absolute -top-1.5 -right-1.5 bg-white text-[var(--color-primary)] text-[9px] font-bold h-4 min-w-4 px-0.5 rounded-full flex items-center justify-center shadow-sm tabular-nums">
                                    {count}
                                </span>
                            </div>
                            <span className="font-semibold text-sm">View Cart</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-base tabular-nums">{formatCurrency(amount)}</span>
                            <ArrowRight size={16} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
