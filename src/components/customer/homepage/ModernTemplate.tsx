'use client'
import { HomepageConfig } from '@/types/database'

export default function ModernTemplate({ config, onMenuClick }: { config: HomepageConfig; onMenuClick: () => void }) {
    return (
        <div className="min-h-screen bg-white">
            <div className="relative h-96 md:h-[32rem] overflow-hidden" style={{ backgroundColor: config.theme_primary }}>
                {config.hero_video_url && <video src={config.hero_video_url} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                {config.hero_image_url && !config.hero_video_url && <img src={config.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative h-full flex flex-col items-center justify-center text-center px-4 z-10">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{config.hero_title}</h1>
                    <p className="text-lg md:text-xl text-gray-100 mb-8">{config.hero_subtitle}</p>
                    <button onClick={onMenuClick} className="inline-flex items-center gap-2 px-8 py-3 bg-white rounded-lg text-lg font-semibold hover:scale-105 transition" style={{ color: config.theme_primary }}>
                        {config.hero_cta_text} →
                    </button>
                </div>
            </div>

            {config.about?.enabled && (
                <div className="py-16 md:py-24 px-4 bg-gray-50">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            {config.about.image_url && <img src={config.about.image_url} alt={config.about.title} className="rounded-lg h-96 object-cover" />}
                            <div>
                                <h2 className="text-3xl font-bold mb-4 text-gray-900">{config.about.title}</h2>
                                <p className="text-gray-600 text-lg">{config.about.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {config.features && config.features.length > 0 && (
                <div className="py-16 md:py-24 px-4 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Why Choose Us</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            {config.features.map((feature, idx) => (
                                <div key={idx} className="text-center">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: config.theme_primary }}>
                                        <span className="text-white text-2xl">✓</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                                    <p className="text-gray-600">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {config.cta?.enabled && (
                <div className="py-16 md:py-24 px-4" style={{ backgroundColor: config.theme_primary }}>
                    <div className="max-w-4xl mx-auto text-center text-white">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">{config.cta.headline}</h2>
                        <p className="text-lg mb-8 opacity-90">{config.cta.description}</p>
                        <button onClick={onMenuClick} className="px-8 py-3 bg-white rounded-lg font-semibold hover:scale-105 transition" style={{ color: config.theme_primary }}>
                            {config.cta.button_text}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
