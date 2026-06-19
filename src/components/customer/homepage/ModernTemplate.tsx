'use client'
import { HomepageConfig } from '@/types/database'

export default function ModernTemplate({ config, onMenuClick }: { config: HomepageConfig; onMenuClick: () => void }) {
    return (
        <div className="min-h-screen bg-white">
            <div className="relative h-96 md:h-[32rem] overflow-hidden" style={{ backgroundColor: config.theme_primary }}>
                {config.hero_video_url && <video src={config.hero_video_url} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                {config.hero_image_url && !config.hero_video_url && <img src={config.hero_image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                <div className="relative h-full flex flex-col items-center justify-center text-center px-4 z-10 animate-fade-up">
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-xl tracking-tight">{config.hero_title}</h1>
                    <p className="text-xl md:text-2xl text-gray-100 mb-10 max-w-2xl font-light">{config.hero_subtitle}</p>
                    <button onClick={onMenuClick} className="inline-flex items-center gap-3 px-10 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-full text-lg font-semibold hover:bg-white hover:text-black hover:scale-105 transition-all duration-300 shadow-2xl">
                        {config.hero_cta_text} <span className="text-xl">→</span>
                    </button>
                </div>
            </div>

            {config.about?.enabled && (
                <div className="py-16 md:py-24 px-4 bg-gray-50">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            {config.about.image_url && <div className="animate-fade-up"><img src={config.about.image_url} alt={config.about.title} className="rounded-2xl h-96 w-full object-cover shadow-2xl card-hover" /></div>}
                            <div className="animate-fade-up delay-100">
                                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 tracking-tight">{config.about.title}</h2>
                                <p className="text-gray-600 text-lg md:text-xl leading-relaxed font-light">{config.about.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {config.features && config.features.length > 0 && (
                <div className="py-16 md:py-24 px-4 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900 tracking-tight animate-fade-up">Why Choose Us</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            {config.features.map((feature, idx) => (
                                <div key={idx} className="text-center bg-gray-50 p-8 rounded-3xl card-hover animate-fade-up" style={{ animationDelay: `${(idx+1)*100}ms`}}>
                                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3 hover:rotate-0 transition-transform" style={{ backgroundColor: config.theme_primary }}>
                                        <span className="text-white text-3xl">✓</span>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                                    <p className="text-gray-600 leading-relaxed font-light">{feature.description}</p>
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
