'use client'
import Image from 'next/image'
import { HomepageConfig } from '@/types/database'
export default function ClassicTemplate({ config, onMenuClick }: { config: HomepageConfig; onMenuClick: () => void }) {
    return <div className="min-h-screen bg-amber-50">
        <div className="relative h-96 md:h-[600px] flex items-center justify-center px-4 overflow-hidden" style={{ backgroundColor: config.theme_primary }}>
            {config.hero_image_url && <Image src={config.hero_image_url} alt="Hero" fill className="object-cover opacity-40 mix-blend-overlay animate-scale-in" sizes="100vw" />}
            <div className="relative text-center text-white z-10 animate-fade-up">
                <h1 className="text-5xl md:text-7xl font-serif mb-6 drop-shadow-lg">{config.hero_title}</h1>
                <p className="text-xl md:text-2xl mb-10 drop-shadow-md font-light">{config.hero_subtitle}</p>
                <button onClick={onMenuClick} className="px-10 py-4 border border-white/40 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white hover:text-black transition-all duration-300 font-medium tracking-wide shadow-2xl">{config.hero_cta_text}</button>
            </div>
        </div>
        {config.about?.enabled && <div className="py-24 px-4 bg-white"><div className="max-w-4xl mx-auto animate-fade-up delay-100"><h2 className="text-4xl md:text-5xl font-serif text-center mb-8" style={{color: config.theme_primary}}>{config.about.title}</h2><p className="text-lg md:text-xl leading-relaxed text-gray-700 text-center font-light">{config.about.description}</p></div></div>}
        {config.features && config.features.length > 0 && <div className="py-24 px-4 bg-amber-50/50"><div className="max-w-6xl mx-auto"><h2 className="text-4xl md:text-5xl font-serif text-center mb-16 animate-fade-up" style={{color: config.theme_primary}}>Our Specialties</h2><div className="grid md:grid-cols-3 gap-12">{config.features.map((f, i) => <div key={i} className="border-l-4 pl-6 card-hover p-6 rounded-r-2xl bg-white shadow-sm animate-fade-up" style={{borderColor: config.theme_primary, animationDelay: `${(i+1)*150}ms`}}><h3 className="text-2xl font-serif mb-3" style={{color: config.theme_primary}}>{f.title}</h3><p className="text-gray-600 leading-relaxed">{f.description}</p></div>)}</div></div></div>}
        {config.cta?.enabled && <div className="py-24 px-4 bg-white"><div className="max-w-4xl mx-auto text-center animate-fade-up"><h2 className="text-4xl md:text-6xl font-serif mb-6" style={{color: config.theme_primary}}>{config.cta.headline}</h2><p className="text-xl text-gray-600 mb-10 font-light">{config.cta.description}</p><button onClick={onMenuClick} className="px-10 py-4 text-white rounded-xl hover:scale-105 hover:shadow-xl transition-all duration-300 font-medium tracking-wide" style={{backgroundColor: config.theme_primary}}>{config.cta.button_text}</button></div></div>}
    </div>
}
