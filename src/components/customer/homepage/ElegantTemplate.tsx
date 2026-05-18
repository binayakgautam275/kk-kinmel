'use client'
import { HomepageConfig } from '@/types/database'

export default function ElegantTemplate({ config, onMenuClick }: { config: HomepageConfig; onMenuClick: () => void }) {
    return (
        <div className="min-h-screen bg-white">
            <div className="relative h-96 md:h-128 flex items-center justify-center" style={{ backgroundColor: config.theme_primary }}>
                {config.hero_image_url && <img src={config.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
                <div className="relative z-10 text-center text-white">
                    <h1 className="text-5xl md:text-6xl font-serif mb-4">{config.hero_title}</h1>
                    <p className="text-xl md:text-2xl mb-12 opacity-90">{config.hero_subtitle}</p>
                    <button onClick={onMenuClick} className="px-8 py-3 border-2 border-white rounded-lg hover:bg-white/10">{config.hero_cta_text}</button>
                </div>
            </div>

            {config.about?.enabled && (
                <>
                    <div className="h-px" style={{ backgroundColor: config.theme_primary }} />
                    <div className="py-20 px-4 bg-white">
                        <div className="max-w-4xl mx-auto text-center">
                            <h2 className="text-4xl font-serif mb-8" style={{ color: config.theme_primary }}>{config.about.title}</h2>
                            <p className="text-lg text-gray-600">{config.about.description}</p>
                        </div>
                    </div>
                </>
            )}

            {config.features && config.features.length > 0 && (
                <>
                    <div className="h-px" style={{ backgroundColor: config.theme_primary }} />
                    <div className="py-20 px-4 bg-gray-50">
                        <div className="max-w-6xl mx-auto">
                            <h2 className="text-4xl font-serif text-center mb-16" style={{ color: config.theme_primary }}>Our Features</h2>
                            <div className="grid md:grid-cols-2 gap-12">
                                {config.features.map((feature, idx) => (
                                    <div key={idx} className="border-l-4 pl-6" style={{ borderColor: config.theme_primary }}>
                                        <h3 className="text-2xl font-serif mb-3" style={{ color: config.theme_primary }}>{feature.title}</h3>
                                        <p className="text-gray-600">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {config.cta?.enabled && (
                <>
                    <div className="h-px" style={{ backgroundColor: config.theme_primary }} />
                    <div className="py-20 px-4 bg-white">
                        <div className="max-w-4xl mx-auto text-center">
                            <h2 className="text-4xl font-serif mb-6" style={{ color: config.theme_primary }}>{config.cta.headline}</h2>
                            <p className="text-lg text-gray-600 mb-8">{config.cta.description}</p>
                            <button onClick={onMenuClick} className="px-8 py-3 rounded-lg text-white hover:scale-105" style={{ backgroundColor: config.theme_primary }}>{config.cta.button_text}</button>
                        </div>
                    </div>
                </>
            )}

            {config.footer?.enabled && (
                <>
                    <div className="h-px" style={{ backgroundColor: config.theme_primary }} />
                    <footer className="py-8 px-4 text-center text-gray-600">
                        <p>{config.footer.copyright}</p>
                    </footer>
                </>
            )}
        </div>
    )
}
