'use client'
import { HomepageConfig } from '@/types/database'
import ModernTemplate from './ModernTemplate'
import ElegantTemplate from './ElegantTemplate'
import VibrantTemplate from './VibrantTemplate'
import MinimalTemplate from './MinimalTemplate'
import ClassicTemplate from './ClassicTemplate'

export default function HomepageRenderer({ config, onMenuClick }: { config: HomepageConfig; onMenuClick: () => void }) {
    switch (config.template) {
        case 'elegant': return <ElegantTemplate config={config} onMenuClick={onMenuClick} />
        case 'vibrant': return <VibrantTemplate config={config} onMenuClick={onMenuClick} />
        case 'minimal': return <MinimalTemplate config={config} onMenuClick={onMenuClick} />
        case 'classic': return <ClassicTemplate config={config} onMenuClick={onMenuClick} />
        default: return <ModernTemplate config={config} onMenuClick={onMenuClick} />
    }
}
