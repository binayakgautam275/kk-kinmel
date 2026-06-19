'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Save, Type, Palette, Image as ImageIcon, Upload, X, RefreshCw, ExternalLink, Smartphone } from 'lucide-react'
import type { Settings } from '@/types/database'
import { toast } from 'react-hot-toast'
import { updateThemeAction, updateBrandingAction } from '@/app/(admin)/admin/theme/actions'

// Mirror the font/radius mapping used by the root layout (src/app/layout.tsx)
// so the live preview matches exactly what customers will see once published.
const FONT_MAP: Record<string, string> = {
    Inter: 'var(--font-inter), sans-serif',
    Playfair: 'var(--font-playfair), serif',
    Roboto: 'var(--font-roboto), sans-serif',
    Lato: 'var(--font-lato), sans-serif',
}

const RADIUS_MAP: Record<string, string> = {
    none: '0px', sm: '4px', md: '8px', lg: '12px', xl: '20px', full: '9999px',
}

function resolveRadius(val: string | undefined): string {
    if (!val) return RADIUS_MAP.lg
    if (RADIUS_MAP[val]) return RADIUS_MAP[val]
    if (/^\d+(\.\d+)?(px|rem|em)$/.test(val)) return val
    return RADIUS_MAP.lg
}

function themeToCSS(theme: Partial<Settings['theme']> = {}): string {
    return `:root {
        --color-primary: ${theme.primaryColor || '#E85D04'};
        --color-secondary: ${theme.secondaryColor || '#1B263B'};
        --color-accent: ${theme.accentColor || '#EC4899'};
        --font-family: ${FONT_MAP[theme.fontFamily || 'Inter'] || FONT_MAP.Inter};
        --border-radius: ${resolveRadius(theme.borderRadius)};
    }`
}

export default function ThemeCustomizer({
    initialSettings,
    restaurantSlug = null,
    initialLogoUrl = null,
}: {
    initialSettings: Partial<Settings>
    restaurantName?: string
    restaurantSlug?: string | null
    initialLogoUrl?: string | null
}) {
    const [settings, setSettings] = useState(initialSettings)
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [previewLoading, setPreviewLoading] = useState(true)
    const [previewKey, setPreviewKey] = useState(0)
    const previewUrl = restaurantSlug ? `/takeout/${restaurantSlug}` : null

    // Inject (or update) a <style> override inside the same-origin preview iframe
    // so colour/font/radius tweaks render instantly — before the admin publishes.
    const applyPreviewOverride = useCallback(() => {
        const doc = iframeRef.current?.contentDocument
        if (!doc?.head) return
        let style = doc.getElementById('__theme_preview_override') as HTMLStyleElement | null
        if (!style) {
            style = doc.createElement('style')
            style.id = '__theme_preview_override'
            doc.head.appendChild(style)
        }
        // Appended last in <head>, so it wins over the layout's :root rule.
        style.textContent = themeToCSS(settings.theme)
    }, [settings.theme])

    // Re-apply whenever the theme changes or the iframe reloads.
    useEffect(() => {
        applyPreviewOverride()
    }, [applyPreviewOverride, previewKey])

    const handleSave = async () => {
        if (!settings.id || !settings.theme) return
        setIsSaving(true)
        const result = await updateThemeAction(settings.id, settings.theme as Record<string, string>)
        setIsSaving(false)
        if (!result.error) {
            toast.success('Theme saved — changes are now live.')
            // Reload the preview so server-rendered structural changes (e.g. menu
            // layout) reflect the freshly published settings, not just the overlay.
            setPreviewLoading(true)
            setPreviewKey((k) => k + 1)
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
            <div className="flex items-center justify-between mt-8 mb-4">
                <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Smartphone size={18} className="text-gray-400" />
                        Live Customer App Preview
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Colors, fonts and corners update instantly. Click <span className="font-medium">Publish Changes</span> to make them live for customers.
                    </p>
                </div>
                {previewUrl && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setPreviewLoading(true); setPreviewKey((k) => k + 1) }}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            <ExternalLink size={14} /> Open
                        </a>
                    </div>
                )}
            </div>
            <div className="bg-gray-200 p-4 rounded-2xl flex justify-center">
                {previewUrl ? (
                    <div className="w-[375px] h-[750px] bg-white rounded-[32px] overflow-hidden shadow-2xl border-8 border-gray-900 relative">
                        {previewLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white">
                                <RefreshCw size={28} className="text-gray-300 animate-spin" />
                                <span className="text-sm text-gray-400">Loading preview…</span>
                            </div>
                        )}
                        <iframe
                            key={previewKey}
                            ref={iframeRef}
                            src={previewUrl}
                            title="Live customer app preview"
                            className="w-full h-full border-0"
                            onLoad={() => { setPreviewLoading(false); applyPreviewOverride() }}
                        />
                    </div>
                ) : (
                    <div className="w-[375px] h-[750px] bg-white rounded-[32px] shadow-2xl border-8 border-gray-900 flex flex-col items-center justify-center text-center p-8 gap-3">
                        <Smartphone size={32} className="text-gray-300" />
                        <p className="text-sm text-gray-500">
                            Live preview unavailable — this restaurant doesn’t have a public URL configured yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
