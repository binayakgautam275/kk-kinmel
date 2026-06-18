'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import CategoryNav from './CategoryNav'
import MenuItemCard from './MenuItemCard'
import type { MenuCategory, MenuItem } from '@/types/database'
import { useTranslation } from '@/lib/contexts/TranslationContext'

export default function MenuSection({
    categories,
    items,
    sessionId,
    restaurantSlug,
    restaurantId,
}: {
    categories: MenuCategory[]
    items: MenuItem[]
    sessionId?: string
    restaurantSlug: string
    restaurantId?: string
}) {
    const { t } = useTranslation()
    const [activeCategory, setActiveCategory] = useState('all')
    const observerRef = useRef<IntersectionObserver | null>(null)
    // Track whether a programmatic scroll is in progress to suppress spy updates
    const isScrollingRef = useRef(false)
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleCategoryChange = useCallback((id: string) => {
        setActiveCategory(id)
        // Suppress scroll-spy for 800ms while smooth-scroll plays out
        isScrollingRef.current = true
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
        scrollTimerRef.current = setTimeout(() => {
            isScrollingRef.current = false
        }, 800)
    }, [])

    // Build list of sections to observe: one per category + 'all' sentinel at top
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect()

        // Sticky header (56px) + category nav (44px) + small gap = ~108px
        const SCROLL_OFFSET = 110

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (isScrollingRef.current) return
                // Pick the topmost visible section
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
                if (visible.length > 0) {
                    const id = visible[0].target.getAttribute('data-category-id')
                    if (id) setActiveCategory(id)
                }
            },
            {
                rootMargin: `-${SCROLL_OFFSET}px 0px -40% 0px`,
                threshold: 0,
            }
        )

        categories.forEach(c => {
            const el = document.getElementById(`category-section-${c.id}`)
            if (el) observerRef.current!.observe(el)
        })
        // Also observe the "all" sentinel at the very top
        const allEl = document.getElementById('category-section-all')
        if (allEl) observerRef.current!.observe(allEl)

        return () => observerRef.current?.disconnect()
    }, [categories])

    // Items grouped by category in display order
    const categoriesWithItems = categories
        .map(c => ({
            category: c,
            items: items.filter(item => item.category_id === c.id),
        }))
        .filter(g => g.items.length > 0)

    const uncategorised = items.filter(item => !item.category_id || !categories.find(c => c.id === item.category_id))

    return (
        <>
            <CategoryNav
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
            />

            <div className="pt-4 pb-12 space-y-8">
                {/* "All" sentinel — invisible element for scroll-spy when scrolled to very top */}
                <div id="category-section-all" data-category-id="all" className="h-0" />

                {uncategorised.length > 0 && (
                    <section>
                        <ItemGrid
                            items={uncategorised}
                            sessionId={sessionId}
                            restaurantSlug={restaurantSlug}
                            restaurantId={restaurantId}
                        />
                    </section>
                )}

                {categoriesWithItems.map(({ category, items: catItems }) => (
                    <section
                        key={category.id}
                        id={`category-section-${category.id}`}
                        data-category-id={category.id}
                    >
                        {/* Category heading */}
                        <div className="flex items-center gap-3 mb-4">
                            <h2 className="text-base font-bold text-gray-900 leading-none">
                                {t('category_name', category.id, category.name)}
                            </h2>
                            <span className="text-xs text-gray-400 font-medium">{catItems.length} items</span>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        <ItemGrid
                            items={catItems}
                            sessionId={sessionId}
                            restaurantSlug={restaurantSlug}
                            restaurantId={restaurantId}
                        />
                    </section>
                ))}

                {categoriesWithItems.length === 0 && uncategorised.length === 0 && (
                    <div className="py-16 text-center text-gray-400 text-sm">
                        No menu items available.
                    </div>
                )}
            </div>
        </>
    )
}

function ItemGrid({ items, sessionId, restaurantSlug, restaurantId }: {
    items: MenuItem[]
    sessionId?: string
    restaurantSlug: string
    restaurantId?: string
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {items.map((item) => (
                <MenuItemCard
                    key={item.id}
                    item={item}
                    sessionId={sessionId}
                    restaurantSlug={restaurantSlug}
                    restaurantId={restaurantId}
                />
            ))}
        </div>
    )
}
