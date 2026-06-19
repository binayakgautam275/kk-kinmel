'use client'

import { useState } from 'react'
import { Save, Type, Palette, Image as ImageIcon, Upload, X } from 'lucide-react'
import type { Settings } from '@/types/database'
import { toast } from 'react-hot-toast'
import { updateThemeAction, updateBrandingAction } from '@/app/(admin)/admin/theme/actions'

export default function ThemeCustomizer({
    initialSettings,
    restaurantName,
    initialLogoUrl = null,
}: {
    initialSettings: Partial<Settings>
    restaurantName?: string
    initialLogoUrl?: string | null
}) {
    const [settings, setSettings] = useState(initialSettings)
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

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

    const handleLogoUpload = async (file: File) => {
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'image')
            formData.append('folder', 'branding')
            const res = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Upload failed')
                return
            }
            const result = await updateBrandingAction(data.url)
            if (result.error) {
                toast.error('Failed to save logo: ' + result.error)
                return
            }
            setLogoUrl(data.url)
            toast.success('Logo updated — now live.')
        } catch {
            toast.error('Network error during upload')
        } finally {
            setIsUploading(false)
        }
    }

    const handleLogoRemove = async () => {
        const result = await updateBrandingAction(null)
        if (result.error) {
            toast.error('Failed to remove logo: ' + result.error)
            return
        }
        setLogoUrl(null)
        toast.success('Logo removed.')
    }

    const updateTheme = (key: string, value: string) => {
        setSettings((prev: Partial<Settings>) => ({
            ...prev,
            theme: {
                ...prev.theme,
                primaryColor: prev.theme?.primaryColor || '',
                secondaryColor: prev.theme?.secondaryColor || '',
                accentColor: prev.theme?.accentColor || '',
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

            {/* Logo */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                    <ImageIcon className="text-gray-400" />
                    <h2 className="text-lg font-semibold">Brand Logo</h2>
                </div>
                <div className="flex items-center gap-5">
                    <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <ImageIcon className="text-gray-300" size={32} />
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition w-fit text-sm font-medium text-gray-700">
                            <Upload size={15} />
                            {isUploading ? 'Uploading…' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
                            <input
                                type="file"
                                accept="image/*"
                                disabled={isUploading}
                                onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]) }}
                                className="hidden"
                            />
                        </label>
                        {logoUrl && (
                            <button onClick={handleLogoRemove} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 w-fit">
                                <X size={14} /> Remove
                            </button>
                        )}
                        <p className="text-xs text-gray-400">Shown in your customer ordering app header. PNG with transparent background recommended.</p>
                    </div>
                </div>
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
                            { key: 'accentColor',    label: 'Accent Color',    def: '#EC4899' },
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Menu Layout</label>
                            <select
                                value={settings.theme?.menuLayout || 'grid'}
                                onChange={(e) => updateTheme('menuLayout', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            >
                                <option value="grid">Grid (cards side by side)</option>
                                <option value="list">List (full-width rows)</option>
                            </select>
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
