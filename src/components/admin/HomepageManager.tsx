'use client'

import { useState, useEffect } from 'react'
import { HomepageConfig, HomepageTemplate, HOMEPAGE_TEMPLATES } from '@/types/database'
import { Eye, Loader2, AlertCircle, Upload, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import HomepageRenderer from '@/components/customer/homepage/HomepageRenderer'
import { useHomepageConfig } from '@/lib/hooks/useHomepageConfig'

interface HomepageManagerProps {
    restaurantId: string
}

const DEFAULT_CONFIG: HomepageConfig = {
    restaurant_id: '',
    template: 'modern',
    hero_title: 'Welcome to Our Restaurant',
    hero_subtitle: 'Experience authentic flavors',
    hero_image_url: null,
    hero_video_url: null,
    hero_cta_text: 'View Menu',
    theme_primary: '#E85D04',
    theme_secondary: '#1B263B',
    theme_accent: '#EC4899',
    about: {
        enabled: true,
        title: 'About Us',
        description: 'Tell your story here',
        image_url: ''
    },
    features: [
        { title: 'Fresh Ingredients', description: 'Sourced daily' },
        { title: 'Expert Chefs', description: 'Years of experience' },
        { title: '24/7 Service', description: 'Always available' }
    ],
    cta: {
        enabled: true,
        headline: 'Order Now',
        description: 'Get your favorite meal delivered',
        button_text: 'Start Ordering'
    },
    footer: {
        enabled: true,
        copyright: '© 2024 Your Restaurant',
        social_links: []
    }
}

export default function HomepageManager({ restaurantId }: HomepageManagerProps) {
    const { config: fetchedConfig, isLoading, error } = useHomepageConfig(restaurantId)
    const [config, setConfig] = useState<HomepageConfig>(DEFAULT_CONFIG)
    const [isSaving, setIsSaving] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'template' | 'hero' | 'theme'>('template')

    // Update config when fetched data changes
    useEffect(() => {
        if (fetchedConfig) {
            setConfig(fetchedConfig)
        } else if (fetchedConfig === null) {
            // Initialize with default for new restaurant
            setConfig({ ...DEFAULT_CONFIG, restaurant_id: restaurantId })
        }
    }, [fetchedConfig, restaurantId])

    const handleTemplateSelect = async (template: HomepageTemplate) => {
        const newConfig = { ...config, template }
        setConfig(newConfig)
        await saveConfig(newConfig)
    }

    const uploadFile = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type)
        formData.append('folder', 'homepage')
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Upload failed')
                return null
            }
            return data.url as string
        } catch {
            toast.error('Network error during upload')
            return null
        }
    }

    const handleImageUpload = async (file: File, field: 'hero_image_url') => {
        const url = await uploadFile(file, 'image')
        if (url) {
            setConfig({ ...config, [field]: url })
            toast.success('Image uploaded')
        }
    }

    const handleVideoUpload = async (file: File) => {
        const url = await uploadFile(file, 'video')
        if (url) {
            setConfig({ ...config, hero_video_url: url })
            toast.success('Video uploaded')
        }
    }

    const saveConfig = async (updatedConfig: HomepageConfig) => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/homepage/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
            })

            const data = await response.json()
            if (!response.ok) {
                toast.error(data.error || 'Failed to save homepage')
                return
            }

            toast.success('Homepage updated successfully')
            setConfig(data.config || updatedConfig)
        } catch (error) {
            toast.error('Error saving homepage')
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-gray-500">Loading homepage configuration...</p>
            </div>
        )
    }

    // Error state
    if (error && error !== 'No homepage config found') {
        return (
            <div className="p-8 text-center">
                <AlertCircle size={32} className="mx-auto mb-4 text-red-500" />
                <p className="text-gray-900 font-medium mb-2">Failed to load homepage</p>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Editor */}
            <div className="lg:col-span-2 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200">
                    {(['template', 'hero', 'theme'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 font-medium text-sm ${
                                activeTab === tab
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Template Tab */}
                {activeTab === 'template' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Select Template</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {(Object.keys(HOMEPAGE_TEMPLATES) as HomepageTemplate[]).map((template) => (
                                <button
                                    key={template}
                                    onClick={() => handleTemplateSelect(template)}
                                    className={`p-4 rounded-lg border-2 text-center transition ${
                                        config.template === template
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-3xl mb-2">
                                        {HOMEPAGE_TEMPLATES[template].icon}
                                    </div>
                                    <div className="font-medium text-gray-900">
                                        {HOMEPAGE_TEMPLATES[template].name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {HOMEPAGE_TEMPLATES[template].description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Hero Tab */}
                {activeTab === 'hero' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Hero Section</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={config.hero_title || ''}
                                onChange={(e) => setConfig({ ...config, hero_title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                            <input
                                type="text"
                                value={config.hero_subtitle || ''}
                                onChange={(e) => setConfig({ ...config, hero_subtitle: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                            <input
                                type="text"
                                value={config.hero_cta_text || ''}
                                onChange={(e) => setConfig({ ...config, hero_cta_text: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="View Menu"
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image</label>
                            {config.hero_image_url && (
                                <div className="mb-3 relative group">
                                    <img src={config.hero_image_url} alt="Hero" className="h-32 w-full object-cover rounded-lg" />
                                    <button
                                        onClick={() => setConfig({ ...config, hero_image_url: null })}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                                <Upload size={15} className="text-gray-500" />
                                <span className="text-sm font-medium text-gray-600">{config.hero_image_url ? 'Replace Image' : 'Upload Image'}</span>
                                <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'hero_image_url') }} className="hidden" />
                            </label>
                        </div>

                        {/* Video Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hero Video <span className="text-gray-400 font-normal">(optional)</span></label>
                            {config.hero_video_url && (
                                <div className="mb-3 relative">
                                    <video src={config.hero_video_url} className="h-28 w-full object-cover rounded-lg" controls />
                                    <button onClick={() => setConfig({ ...config, hero_video_url: null })} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                                <Upload size={15} className="text-gray-500" />
                                <span className="text-sm font-medium text-gray-600">{config.hero_video_url ? 'Replace Video' : 'Upload Video (MP4 / WebM)'}</span>
                                <input type="file" accept="video/*" onChange={(e) => { if (e.target.files?.[0]) handleVideoUpload(e.target.files[0]) }} className="hidden" />
                            </label>
                        </div>

                        <button onClick={() => saveConfig(config)} disabled={isSaving} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                            {isSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                )}

                {/* Theme Tab */}
                {activeTab === 'theme' && (
                    <div className="space-y-5">
                        <h3 className="text-lg font-semibold text-gray-900">Homepage Theme Colors</h3>
                        <p className="text-sm text-gray-500 -mt-2">These colors apply to the homepage only. The app-wide brand colors are set in <strong>Brand &amp; Theme</strong>.</p>

                        <div className="space-y-4">
                            {([
                                { key: 'theme_primary' as const,   label: 'Primary',   default: '#E85D04' },
                                { key: 'theme_secondary' as const, label: 'Secondary', default: '#1B263B' },
                                { key: 'theme_accent' as const,    label: 'Accent',    default: '#EC4899' },
                            ]).map(({ key, label, default: def }) => {
                                const val = config[key] || def
                                return (
                                    <div key={key} className="flex items-center gap-3">
                                        {/* Color swatch — click to open native picker */}
                                        <label
                                            className="relative w-10 h-10 rounded-xl border-2 border-white shadow-md cursor-pointer shrink-0 ring-1 ring-gray-200"
                                            style={{ backgroundColor: val }}
                                            title="Click to pick color"
                                        >
                                            <input
                                                type="color"
                                                value={val}
                                                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                            />
                                        </label>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                                            <input
                                                type="text"
                                                value={val}
                                                maxLength={7}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setConfig({ ...config, [key]: v })
                                                }}
                                                className="w-28 px-2 py-1 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <button onClick={() => saveConfig(config)} disabled={isSaving} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                            {isSaving ? 'Saving…' : 'Save Colors'}
                        </button>
                    </div>
                )}
            </div>

            {/* Right: Live Preview — scaled phone viewport */}
            <div className="lg:col-span-1">
                <div className="sticky top-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <Eye size={15} className="text-gray-500" />
                        <h3 className="font-semibold text-gray-800 text-sm">Live Preview</h3>
                        <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">375px viewport</span>
                    </div>
                    {/* Scaled preview container — 375px wide content scaled to fit ~33% grid column */}
                    <div className="relative bg-gray-100 overflow-hidden" style={{ height: 480 }}>
                        <div
                            style={{
                                transform: 'scale(0.38)',
                                transformOrigin: 'top left',
                                width: `${100 / 0.38}%`,
                                pointerEvents: 'none',
                                minHeight: `${480 / 0.38}px`,
                            }}
                        >
                            <HomepageRenderer config={config} onMenuClick={() => {}} />
                        </div>
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100 text-center">
                        <button
                            onClick={() => setIsPreviewOpen(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Open full preview →
                        </button>
                    </div>
                </div>
            </div>

            {/* Full-screen preview modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <span className="font-semibold text-gray-800 text-sm">Full Preview — {config.template}</span>
                            <button onClick={() => setIsPreviewOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <HomepageRenderer config={config} onMenuClick={() => setIsPreviewOpen(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
