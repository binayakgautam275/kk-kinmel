import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const DEFAULT_HOMEPAGE = {
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
        description: 'Quality food and excellent service since day one.',
        image_url: ''
    },
    features: [
        { title: 'Fresh Ingredients', description: 'Sourced daily' },
        { title: 'Expert Chefs', description: 'Years of experience' },
        { title: '24/7 Service', description: 'Always available' },
    ],
    cta: {
        enabled: true,
        headline: 'Order Now',
        description: 'Get your favorite meal delivered',
        button_text: 'View Menu',
    },
    footer: {
        enabled: true,
        copyright: `© ${new Date().getFullYear()} Your Restaurant`,
        social_links: [],
    },
}

/** Hydrate hero_cta_text from cta.button_text for client-side compatibility */
function hydrate(row: Record<string, unknown>) {
    if (!row.hero_cta_text && row.cta && typeof row.cta === 'object') {
        const cta = row.cta as Record<string, unknown>
        row.hero_cta_text = cta.button_text || 'View Menu'
    }
    return row
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurant_id')

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
        }

        const supabase = await createServerClient()
        const { data: config, error } = await supabase
            .from('homepage_configs')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No config yet — return typed default so client has the right shape
                return NextResponse.json(
                    { ...DEFAULT_HOMEPAGE, restaurant_id: restaurantId },
                    { status: 404 }  // 404 so HomepageGate skips rendering
                )
            }
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json(hydrate(config as Record<string, unknown>))
    } catch (error) {
        console.error('Homepage GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
