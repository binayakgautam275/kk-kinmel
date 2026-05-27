'use client'

import { useState } from 'react'
import { Save, Type, Palette } from 'lucide-react'
import type { Settings } from '@/types/database'
import { toast } from 'react-hot-toast'
import { updateThemeAction } from '@/app/(admin)/admin/theme/actions'

export default function ThemeCustomizer({ initialSettings, restaurantName }: { initialSettings: Partial<Settings>, restaurantName?: string }) {
    const [settings, setSettings] = useState(initialSettings)
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!settings.id || !settings.theme) return
        setIsSaving(true)
        const result = await updateThemeAction(settings.id, settings.theme as Record<string, string>)
        setIsSaving(false)
        if (!result.error) {
            toast.success('Theme saved — changes are now live.')
        } else {
            toast.error('Failed to save: ' + result.error)
        }
    }

    const updateTheme = (key: string, value: string) => {
        setSettings((prev: Partial<Settings>) => ({
            ...prev,
            theme: {
                ...prev.theme,
                primaryColor: prev.theme?.primaryColor || '',
                secondaryColor: prev.theme?.secondaryColor || '',
                fontFamily: prev.theme?.fontFamily || '',
                borderRadius: prev.theme?.borderRadius || '',
                menuLayout: prev.theme?.menuLayout || '',
                [key]: value
            }
        }))
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Brand & Theme</h1>
                    <p className="text-gray-500 mt-1">Configure the look and feel of your customer-facing ordering app.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[var(--color-primary)] hover:opacity-90 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Publish Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colors */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                        <Palette className="text-gray-400" />
                        <h2 className="text-lg font-semibold">Color Palette</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {([
                            { key: 'primaryColor',   label: 'Primary Color',   def: '#E85D04' },
                            { key: 'secondaryColor', label: 'Secondary Color', def: '#1B263B' },
                        ] as const).map(({ key, label, def }) => {
                            const val = settings.theme?.[key] || def
                            return (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                                    <div className="flex items-center gap-3">
                                        {/* Colored swatch — click opens native color picker */}
                                        <label
                                            className="relative w-10 h-10 rounded-xl border-2 border-white shadow-md cursor-pointer shrink-0 ring-1 ring-gray-200"
                                            style={{ backgroundColor: val }}
                                        >
                                            <input
                                                type="color"
                                                value={val}
                                                onChange={(e) => updateTheme(key, e.target.value)}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                            />
                                        </label>
                                        <input
                                            type="text"
                                            value={val}
                                            maxLength={7}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateTheme(key, v)
                                            }}
                                            className="w-28 px-2 py-1.5 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            placeholder="#000000"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Typography */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                        <Type className="text-gray-400" />
                        <h2 className="text-lg font-semibold">Typography & Radius</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heading Font Family</label>
                            <select
                                value={settings.theme?.fontFamily || "Inter"}
                                onChange={(e) => updateTheme('fontFamily', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            >
                                <option value="Playfair">Playfair Display (Elegant)</option>
                                <option value="Inter">Inter (Modern Clean)</option>
                                <option value="Roboto">Roboto (Geometric)</option>
                                <option value="Lato">Lato (Tech)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Border Radius (px)</label>
                            <input
                                type="range"
                                min="0" max="32"
                                value={isNaN(parseInt(settings.theme?.borderRadius || '12')) ? 12 : parseInt(settings.theme?.borderRadius || '12')}
                                onChange={(e) => updateTheme('borderRadius', `${e.target.value}px`)}
                                className="w-full accent-[var(--color-primary)]"
                            />
                            <div className="text-right text-sm text-gray-500 font-mono mt-1">
                                {settings.theme?.borderRadius || '12px'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Preview Embed */}
            <h3 className="font-semibold text-gray-900 mt-8 mb-4">Live Customer App Preview</h3>
            <div className="bg-gray-200 p-4 rounded-2xl flex justify-center">
                <div
                    className="w-[375px] h-[750px] bg-white rounded-[32px] overflow-hidden shadow-2xl border-8 border-gray-900 relative"
                    style={{
                        '--color-primary': settings.theme?.primaryColor || '#ff6b00',
                        '--color-secondary': settings.theme?.secondaryColor || '#1a1a1a',
                        '--font-family': settings.theme?.fontFamily ? `var(--font-${settings.theme.fontFamily.toLowerCase()})` : 'sans-serif',
                        '--border-radius': settings.theme?.borderRadius || '12px',
                    } as React.CSSProperties}
                >
                    {/* Mock App Header */}
                    <div className="bg-[var(--color-secondary)] h-48 w-full p-6 text-white flex flex-col justify-end relative">
                        <h1 className="text-3xl font-bold font-[family-name:var(--font-family)] tracking-tight relative z-10">
                            {restaurantName || 'Smart Cafe'}
                        </h1>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    </div>

                    <div className="p-4 -mt-6 relative z-20">
                        <div className="bg-white rounded-[var(--border-radius)] shadow-lg p-4 flex justify-between items-center mb-6">
                            <span className="font-semibold text-gray-800">Your Table</span>
                            <span className="text-[var(--color-primary)] font-bold text-lg border-2 border-[var(--color-primary)]/20 px-3 py-1 rounded-full">4</span>
                        </div>

                        <div className="space-y-4">
                            <div className="h-6 w-32 bg-gray-200 rounded"></div>
                            <div className="flex gap-4">
                                <div className="w-24 h-24 bg-gray-100 rounded-[calc(var(--border-radius)-4px)] shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                                    <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                                    <div className="h-5 w-16 bg-[var(--color-primary)]/20 rounded mt-2"></div>
                                </div>
                            </div>

                            <button className="w-full mt-4 bg-[var(--color-primary)] text-white font-medium py-3 rounded-[var(--border-radius)]">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
