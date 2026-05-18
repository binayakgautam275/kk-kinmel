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

    const handleImageUpload = async (file: File, field: 'hero_image_url') => {
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'image')

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            if (!response.ok) {
                toast.error('Failed to upload image')
                return
            }

            setConfig({ ...config, [field]: data.url })
            toast.success('Image uploaded successfully')
        } catch (error) {
            toast.error('Error uploading image')
            console.error(error)
        }
    }

    const handleVideoUpload = async (file: File) => {
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'video')

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            if (!response.ok) {
                toast.error('Failed to upload video')
                return
            }

            setConfig({ ...config, hero_video_url: data.url })
            toast.success('Video uploaded successfully')
        } catch (error) {
            toast.error('Error uploading video')
            console.error(error)
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
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image</label>
                            {config.hero_image_url && (
                                <div className="mb-3 relative inline-block">
                                    <img
                                        src={config.hero_image_url}
                                        alt="Hero"
                                        className="h-32 w-full object-cover rounded-lg"
                                    />
                                    <button
                                        onClick={() => setConfig({ ...config, hero_image_url: null })}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500">
                                <Upload size={16} />
                                <span className="text-sm font-medium">Upload Image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            handleImageUpload(e.target.files[0], 'hero_image_url')
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* Video Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hero Video (Optional)</label>
                            {config.hero_video_url && (
                                <div className="mb-3 relative">
                                    <video
                                        src={config.hero_video_url}
                                        className="h-32 w-full object-cover rounded-lg"
                                        controls
                                    />
                                    <button
                                        onClick={() => setConfig({ ...config, hero_video_url: null })}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500">
                                <Upload size={16} />
                                <span className="text-sm font-medium">Upload Video</span>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            handleVideoUpload(e.target.files[0])
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        <button
                            onClick={() => saveConfig(config)}
                            disabled={isSaving}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}

                {/* Theme Tab */}
                {activeTab === 'theme' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Theme Colors</h3>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config.theme_primary || '#E85D04'}
                                        onChange={(e) => setConfig({ ...config, theme_primary: e.target.value })}
                                        className="w-12 h-10 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={config.theme_primary || '#E85D04'}
                                        onChange={(e) => setConfig({ ...config, theme_primary: e.target.value })}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config.theme_secondary || '#1B263B'}
                                        onChange={(e) => setConfig({ ...config, theme_secondary: e.target.value })}
                                        className="w-12 h-10 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={config.theme_secondary || '#1B263B'}
                                        onChange={(e) => setConfig({ ...config, theme_secondary: e.target.value })}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config.theme_accent || '#EC4899'}
                                        onChange={(e) => setConfig({ ...config, theme_accent: e.target.value })}
                                        className="w-12 h-10 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={config.theme_accent || '#EC4899'}
                                        onChange={(e) => setConfig({ ...config, theme_accent: e.target.value })}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => saveConfig(config)}
                            disabled={isSaving}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Colors'}
                        </button>
                    </div>
                )}
            </div>

            {/* Right: Live Preview */}
            <div className="lg:col-span-1">
                <div className="sticky top-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Eye size={16} />
                            Live Preview
                        </h3>
                    </div>
                    <div className="bg-gray-50 aspect-video overflow-auto">
                        <HomepageRenderer
                            config={config}
                            onMenuClick={() => {
                                toast.success('Menu clicked!')
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
