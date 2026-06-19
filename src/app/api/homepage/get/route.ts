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
    logo_url: null,
    about: {
        enabled: true,
        title: 'About Us',
        description: 'Quality food and excellent service since day one.',
        image_url: '',
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
    gallery: [],
    social: {},
    contact: { enabled: true },
    footer: {
        enabled: true,
        copyright: `© ${new Date().getFullYear()} Your Restaurant`,
        social_links: [],
    },
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurant_id')

        if (!restaurantId) {
            return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
        }

        const supabase = await createServerClient()
        const [{ data: config, error }, { data: restaurant }] = await Promise.all([
            supabase.from('homepage_configs').select('*').eq('restaurant_id', restaurantId).single(),
            supabase.from('restaurants').select('name, logo_url').eq('id', restaurantId).single(),
        ])

        if (error) {
            if (error.code === 'PGRST116') {
                // No config yet — return typed default so client has the right shape
                return NextResponse.json(
                    {
                        ...DEFAULT_HOMEPAGE,
                        restaurant_id: restaurantId,
                        restaurant_name: restaurant?.name,
                        logo_url: restaurant?.logo_url ?? null,
                    },
                    { status: 404 }  // 404 so HomepageGate skips rendering
                )
            }
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // Defensive: features/gallery must be arrays for the templates & manager.
        // Tolerates legacy rows where features was stored as { enabled, items: [] }.
        const row = config as Record<string, unknown>
        if (!Array.isArray(row.features)) {
            const f = row.features as { items?: unknown } | null
            row.features = Array.isArray(f?.items) ? f!.items : []
        }
        if (!Array.isArray(row.gallery)) row.gallery = []

        // Hydrate restaurant name + fall back to the app logo so the homepage
        // shows the same logo set in Brand & Theme until a homepage-specific one is set.
        row.restaurant_name = restaurant?.name
        if (!row.logo_url) row.logo_url = restaurant?.logo_url ?? null

        return NextResponse.json(row)
    } catch (error) {
        console.error('Homepage GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
