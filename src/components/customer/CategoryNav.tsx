'use client'

import { useRef, useEffect } from 'react'
import type { MenuCategory } from '@/types/database'
import { useTranslation } from '@/lib/contexts/TranslationContext'

export default function CategoryNav({
    categories,
    activeCategory,
    onCategoryChange,
}: {
    categories: MenuCategory[]
    activeCategory: string
    onCategoryChange: (id: string) => void
}) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
    const { t } = useTranslation()

    // Scroll the active pill into view whenever it changes
    useEffect(() => {
        const btn = btnRefs.current[activeCategory]
        btn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }, [activeCategory])

    const handleClick = (id: string) => {
        onCategoryChange(id)
        // Scroll the section into view
        const target = document.getElementById(`category-section-${id}`)
        if (target) {
            // Offset for the sticky header (14px header + 48px category nav ≈ 108px)
            const top = target.getBoundingClientRect().top + window.scrollY - 108
            window.scrollTo({ top, behavior: 'smooth' })
        }
    }

    const isActive = (id: string) => activeCategory === id

    return (
        <div className="bg-white border-b border-gray-100 sticky top-14 z-10">
            <div
                ref={scrollRef}
                className="flex overflow-x-auto hide-scrollbar gap-1 px-4 py-2"
                style={{ scrollbarWidth: 'none' }}
            >
                <button
                    ref={el => { btnRefs.current['all'] = el }}
                    onClick={() => handleClick('all')}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                        isActive('all')
                            ? 'bg-primary text-white'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                    All
                </button>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        ref={el => { btnRefs.current[c.id] = el }}
                        onClick={() => handleClick(c.id)}
                        className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                            isActive(c.id)
                                ? 'bg-primary text-white'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        {t('category_name', c.id, c.name)}
                    </button>
                ))}
            </div>
        </div>
    )
}
