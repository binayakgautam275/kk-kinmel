'use client'

import { useState } from 'react'
import { useCartStore, getCartItemKey } from '@/lib/stores/cart'
import { useHydratedStore } from '@/lib/stores/useHydratedStore'
import { formatCurrency } from '@/lib/utils'
import { Plus, Minus, X, Check, Clock } from 'lucide-react'
import Image from 'next/image'
import type { MenuItem, CartItemModifier } from '@/types/database'
import { useTranslation } from '@/lib/contexts/TranslationContext'

// Tags that get distinct color treatments
const TAG_STYLES: Record<string, string> = {
    popular:    'bg-amber-100 text-amber-800',
    bestseller: 'bg-amber-100 text-amber-800',
    new:        'bg-green-100 text-green-800',
    spicy:      'bg-red-100 text-red-700',
    hot:        'bg-red-100 text-red-700',
    veg:        'bg-emerald-100 text-emerald-700',
    vegetarian: 'bg-emerald-100 text-emerald-700',
    vegan:      'bg-emerald-100 text-emerald-700',
    'gluten-free': 'bg-blue-100 text-blue-700',
    recommended: 'bg-purple-100 text-purple-700',
}

// Common allergen emoji shortcuts
const ALLERGEN_ICONS: Record<string, string> = {
    nuts:    '🥜',
    dairy:   '🧀',
    eggs:    '🥚',
    gluten:  '🌾',
    soy:     '🫘',
    fish:    '🐟',
    shellfish: '🦐',
    sesame:  '🫙',
}

export default function MenuItemCard({ item, sessionId, restaurantSlug, restaurantId }: {
    item: MenuItem
    sessionId?: string
    restaurantSlug: string
    restaurantId?: string
}) {
    const { t } = useTranslation()
    const displayName = t('menu_item_name', item.id, item.name)
    const displayDesc = item.description ? t('menu_item_description', item.id, item.description) : null

    const items = useHydratedStore(useCartStore, (s) => s.items)
    const addItem = useCartStore((s) => s.addItem)
    const removeItem = useCartStore((s) => s.removeItem)
    const updateQuantity = useCartStore((s) => s.updateQuantity)
    const setSession = useCartStore((s) => s.setSession)

    const [showModifiers, setShowModifiers] = useState(false)
    const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({})

    const cartItem = items.find((i) => i.menuItemId === item.id)
    const quantity = cartItem?.quantity || 0
    const cartKey = cartItem ? getCartItemKey(cartItem) : ''

    const hasModifiers = item.modifier_groups && item.modifier_groups.length > 0

    function initModSelections() {
        const init: Record<string, string[]> = {}
        item.modifier_groups?.forEach(g => { init[g.id] = [] })
        setSelectedMods(init)
    }

    const handleAdd = () => {
        if (!sessionId) return
        setSession(sessionId, restaurantSlug, restaurantId)

        if (hasModifiers && quantity === 0) {
            initModSelections()
            setShowModifiers(true)
            return
        }

        if (quantity > 0) {
            updateQuantity(cartKey, quantity + 1)
        } else {
            addItem({
                menuItemId: item.id,
                name: item.name,
                price: item.price,
                imageUrl: item.image_url || undefined,
            })
        }
    }

    function handleConfirmModifiers() {
        for (const group of item.modifier_groups || []) {
            const selected = selectedMods[group.id] || []
            if (selected.length < group.min_selections) return
        }

        const modifiers: CartItemModifier[] = []
        for (const group of item.modifier_groups || []) {
            for (const modId of (selectedMods[group.id] || [])) {
                const mod = group.modifiers?.find(m => m.id === modId)
                if (mod) {
                    modifiers.push({
                        modifierId: mod.id,
                        name: mod.name,
                        priceAdjustment: mod.price_adjustment,
                    })
                }
            }
        }

        addItem({
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            imageUrl: item.image_url || undefined,
            modifiers,
        })

        setShowModifiers(false)
    }

    function toggleModifier(groupId: string, modId: string, maxSelections: number) {
        setSelectedMods(prev => {
            const current = prev[groupId] || []
            if (current.includes(modId)) {
                return { ...prev, [groupId]: current.filter(id => id !== modId) }
            }
            if (current.length >= maxSelections) {
                return { ...prev, [groupId]: [...current.slice(0, -1), modId] }
            }
            return { ...prev, [groupId]: [...current, modId] }
        })
    }

    const handleRemove = () => {
        if (quantity > 1) updateQuantity(cartKey, quantity - 1)
        else if (quantity === 1) removeItem(cartKey)
    }

    // Compute modal confirm total
    const modTotal = Object.values(selectedMods).flat().reduce((sum, modId) => {
        const mod = item.modifier_groups?.flatMap(g => g.modifiers || []).find(m => m.id === modId)
        return sum + (mod?.price_adjustment || 0)
    }, 0)

    const displayTags = (item.tags || []).slice(0, 2)
    const displayAllergens = (item.allergens || []).slice(0, 3)

    return (
        <>
        <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 flex flex-col overflow-hidden transition-all hover:shadow-md active:scale-[0.98]">
            {/* Image */}
            <div className="relative w-full aspect-4/3 bg-gray-100 shrink-0">
                {item.image_url ? (
                    <Image
                        src={item.image_url}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-2xl opacity-30">🍽️</span>
                    </div>
                )}

                {/* Sold Out Overlay */}
                {!item.is_available && (
                    <div className="absolute inset-0 bg-white/65 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <span className="bg-white text-gray-700 font-bold px-3 py-1 rounded-full shadow text-xs tracking-wide border border-gray-200">
                            Sold Out
                        </span>
                    </div>
                )}

                {/* Quantity badge overlay — shown when item is in cart */}
                {quantity > 0 && (
                    <div className="absolute top-2 right-2 z-10 bg-[var(--color-primary)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                        {quantity}
                    </div>
                )}

                {/* Tag pill (first tag) — shown on image bottom-left */}
                {displayTags.length > 0 && (
                    <div className="absolute bottom-2 left-2 z-10">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${TAG_STYLES[displayTags[0].toLowerCase()] || 'bg-white/90 text-gray-700'}`}>
                            {displayTags[0]}
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-2.5 flex flex-col flex-1">
                {/* Name + price row */}
                <div className="flex justify-between items-start gap-1 mb-1">
                    <h3 className="font-semibold text-[13px] text-gray-900 leading-snug line-clamp-2">{displayName}</h3>
                    <div className="font-bold text-[13px] text-[var(--color-primary)] shrink-0 ml-1">
                        {formatCurrency(item.price)}
                    </div>
                </div>

                {/* Description */}
                {displayDesc && (
                    <p className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed mb-1.5">
                        {displayDesc}
                    </p>
                )}

                {/* Meta row: prep time + allergens */}
                {(item.preparation_min || displayAllergens.length > 0) && (
                    <div className="flex items-center gap-2 mb-2">
                        {item.preparation_min && item.preparation_min > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                <Clock size={10} />
                                {item.preparation_min}m
                            </span>
                        )}
                        {displayAllergens.length > 0 && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                                {displayAllergens.map(a => ALLERGEN_ICONS[a.toLowerCase()] || '').filter(Boolean).join(' ')}
                            </span>
                        )}
                    </div>
                )}

                {/* Add / quantity controls */}
                <div className="mt-auto">
                    {!sessionId ? (
                        <div className="h-8" /> // spacer in view-only mode
                    ) : quantity === 0 ? (
                        <button
                            onClick={handleAdd}
                            disabled={!item.is_available}
                            className={`flex items-center gap-1.5 w-full justify-center py-2 bg-[var(--color-primary)] text-white rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-all
                            ${!item.is_available ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'}`}
                        >
                            <Plus size={14} /> Add
                        </button>
                    ) : (
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                            <button
                                onClick={handleRemove}
                                className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 active:bg-gray-100 active:scale-95 transition-all"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="font-bold text-sm text-gray-900 w-6 text-center">{quantity}</span>
                            <button
                                onClick={handleAdd}
                                className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--color-primary)] shadow-sm text-white active:opacity-80 active:scale-95 transition-all"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Modifier Selection Sheet */}
        {showModifiers && item.modifier_groups && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[88vh] flex flex-col">
                    {/* Sheet handle on mobile */}
                    <div className="sm:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900">{displayName}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Customise your order</p>
                        </div>
                        <button
                            onClick={() => setShowModifiers(false)}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">
                        {item.modifier_groups.map(group => {
                            const selected = selectedMods[group.id] || []
                            const isRequired = group.min_selections > 0
                            const isSatisfied = selected.length >= group.min_selections
                            return (
                                <div key={group.id}>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <h4 className="font-semibold text-gray-900 text-sm">{group.name}</h4>
                                        {isRequired && !isSatisfied && (
                                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Required</span>
                                        )}
                                        {isRequired && isSatisfied && (
                                            <Check size={13} className="text-green-600" />
                                        )}
                                        <span className="text-xs text-gray-400 ml-auto">
                                            {group.max_selections === 1 ? 'Choose 1' : `Up to ${group.max_selections}`}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {group.modifiers?.filter(m => m.is_available).map(mod => {
                                            const isSelected = selected.includes(mod.id)
                                            return (
                                                <button
                                                    key={mod.id}
                                                    onClick={() => toggleModifier(group.id, mod.id, group.max_selections)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                                                        isSelected
                                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/30'
                                                            : 'border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                                                            isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && <Check size={9} className="text-white" />}
                                                        </div>
                                                        <span className={isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}>
                                                            {mod.name}
                                                        </span>
                                                    </div>
                                                    <span className={`text-sm ${isSelected ? 'text-[var(--color-primary)] font-medium' : 'text-gray-400'}`}>
                                                        {mod.price_adjustment > 0
                                                            ? `+${formatCurrency(mod.price_adjustment)}`
                                                            : mod.price_adjustment < 0
                                                                ? formatCurrency(mod.price_adjustment)
                                                                : 'Free'}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="p-4 border-t border-gray-100">
                        <button
                            onClick={handleConfirmModifiers}
                            className="w-full bg-[var(--color-primary)] text-white py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition shadow-lg shadow-[var(--color-primary)]/20"
                        >
                            Add to Cart — {formatCurrency(item.price + modTotal)}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
