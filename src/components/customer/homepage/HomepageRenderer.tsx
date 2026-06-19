'use client'
import { HomepageConfig } from '@/types/database'
import ModernTemplate from './ModernTemplate'
import ElegantTemplate from './ElegantTemplate'
import VibrantTemplate from './VibrantTemplate'
import MinimalTemplate from './MinimalTemplate'
import ClassicTemplate from './ClassicTemplate'
import NavBar from './sections/NavBar'
import GallerySection from './sections/GallerySection'
import ContactSection from './sections/ContactSection'
import FooterSection from './sections/FooterSection'

export default function HomepageRenderer({ config, onMenuClick }: { config: HomepageConfig; onMenuClick: () => void }) {
    const Template = (() => {
        switch (config.template) {
            case 'elegant': return ElegantTemplate
            case 'vibrant': return VibrantTemplate
            case 'minimal': return MinimalTemplate
            case 'classic': return ClassicTemplate
            default: return ModernTemplate
        }
    })()

    return (
        <>
            <NavBar config={config} onMenuClick={onMenuClick} />
            <Template config={config} onMenuClick={onMenuClick} />
            {/* Shared sections rendered after every template for consistency */}
            <GallerySection gallery={config.gallery} accent={config.theme_accent} />
            <ContactSection contact={config.contact} primary={config.theme_primary} />
            <FooterSection footer={config.footer} social={config.social} logoUrl={config.logo_url} restaurantName={config.restaurant_name} />
        </>
    )
}
