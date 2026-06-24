'use client'

import { useState } from 'react'
import Image from 'next/image'
import Logo from '@/components/shared/Logo'
import TakeoutForm from '@/components/customer/TakeoutForm'
import ActiveOrderPill from '@/components/customer/ActiveOrderPill'
import { useCartStore } from '@/lib/stores/cart'
import { Plus, Minus, ShoppingBag } from 'lucide-react'
import { TranslationProvider, useTranslation } from '@/lib/contexts/TranslationContext'
import { FeatureProvider, useCurrency } from '@/lib/contexts/FeatureContext'
import type { Settings } from '@/types/database'
import LanguageSwitcher from '@/components/customer/LanguageSwitcher'

interface MenuItem {
    id: string; name: string; description: string | null; price: number
    image_url: string | null; category_id: string; is_available: boolean
}
interface Category { id: string; name: string; sort_order: number }
interface Restaurant { id: string; name: string; slug: string; description: string | null; logo_url: string | null }
interface TranslationRow { language_code: string; entity_type: string; entity_id: string; translated_text: string }

interface Props {
    restaurant: Restaurant
    categories: Category[]
    menuItems: MenuItem[]
    translations: TranslationRow[]
    supportedLanguages: { code: string; name: string }[]
    features: Settings['features_v2'] | null
}

export default function TakeoutPageClient({ restaurant, categories, menuItems, translations, supportedLanguages, features }: Props) {
    return (
        <FeatureProvider features={features}>
            <TranslationProvider translations={translations} supportedLanguages={supportedLanguages} restaurantId={restaurant.id}>
                <TakeoutMenu restaurant={restaurant} categories={categories} menuItems={menuItems} />
            </TranslationProvider>
        </FeatureProvider>
    )
}

function TakeoutMenu({ restaurant, categories, menuItems }: {
    restaurant: Restaurant; categories: Category[]; menuItems: MenuItem[]
}) {
    const { t } = useTranslation()
    const money = useCurrency()
    const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '')
    const [showCheckout, setShowCheckout] = useState(false)
    const addItem = useCartStore(s => s.addItem)
    const removeItem = useCartStore(s => s.removeItem)
    const items = useCartStore(s => s.items)
    const totalAmount = useCartStore(s => s.totalAmount)

    const filteredItems = activeCategory
        ? menuItems.filter(i => i.category_id === activeCategory)
        : menuItems

    function getQty(itemId: string) {
        return items.find(i => i.menuItemId === itemId)?.quantity || 0
    }

    if (showCheckout) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-lg mx-auto px-4 py-8">
                    <button onClick={() => setShowCheckout(false)}
                        className="text-sm text-gray-500 mb-4 hover:text-gray-900">← Back to menu</button>
                    <TakeoutForm restaurantId={restaurant.id} restaurantName={restaurant.name} restaurantSlug={restaurant.slug} />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <ActiveOrderPill />
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
                    <Logo className="h-7" />
                    <div className="flex-1">
                        <h1 className="font-bold text-gray-900">{restaurant.name}</h1>
                        <p className="text-xs text-gray-500">Takeout Order</p>
                    </div>
                    <LanguageSwitcher />
                    {items.length > 0 && (
                        <button onClick={() => setShowCheckout(true)}
                            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            <ShoppingBag size={16} />
                            <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
                            <span>{money(totalAmount())}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Category Tabs */}
            <div className="bg-white border-b border-gray-100 sticky top-[73px] z-10">
                <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
                    {categories.map(c => (
                        <button key={c.id}
                            onClick={() => setActiveCategory(c.id)}
                            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium transition ${activeCategory === c.id
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {t('category_name', c.id, c.name)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredItems.map(item => {
                        const qty = getQty(item.id)
                        const displayName = t('menu_item_name', item.id, item.name)
                        const displayDesc = item.description ? t('menu_item_description', item.id, item.description) : null
                        return (
                            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
                                {item.image_url && (
                                    <Image src={item.image_url} alt={displayName} width={80} height={80}
                                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm">{displayName}</h3>
                                    {displayDesc && (
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{displayDesc}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="font-semibold text-gray-900">{money(item.price)}</span>
                                        {qty === 0 ? (
                                            <button onClick={() => addItem({
                                                menuItemId: item.id,
                                                name: item.name,
                                                price: item.price,
                                                imageUrl: item.image_url || undefined,
                                            })}
                                                className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                                                <Plus size={14} /> Add
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => removeItem(item.id)}
                                                    className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-700">
                                                    <Minus size={14} />
                                                </button>
                                                <span className="font-semibold text-gray-900 w-5 text-center">{qty}</span>
                                                <button onClick={() => addItem({
                                                    menuItemId: item.id,
                                                    name: item.name,
                                                    price: item.price,
                                                    imageUrl: item.image_url || undefined,
                                                })}
                                                    className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-white">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Floating Cart Bar */}
            {items.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 md:hidden z-20">
                    <button onClick={() => setShowCheckout(true)}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                        <ShoppingBag size={18} />
                        Checkout ({items.reduce((s, i) => s + i.quantity, 0)} items) — {money(totalAmount())}
                    </button>
                </div>
            )}
        </div>
    )
}
