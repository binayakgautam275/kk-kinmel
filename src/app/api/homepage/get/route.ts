import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { HOMEPAGE_TEMPLATES } from '@/types/database'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurant_id')

        if (!restaurantId) {
            return NextResponse.json(
                { error: 'restaurant_id is required' },
                { status: 400 }
            )
        }

        const supabase = await createServerClient()

        const { data: config, error } = await supabase
            .from('homepage_configs')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No config found, return default template
                return NextResponse.json({
                    restaurant_id: restaurantId,
                    template: 'modern',
                    theme: {
                        primary: '#3B82F6',
                        secondary: '#1F2937',
                        accent: '#EC4899'
                    },
                    hero: {
                        enabled: true,
                        image_url: '',
                        headline: 'Welcome to Our Restaurant',
                        subtitle: 'Discover delicious food',
                        cta_text: 'View Menu',
                        video_url: ''
                    },
                    about: {
                        enabled: true,
                        title: 'About Us',
                        description: 'Quality food and excellent service since day one.',
                        image_url: ''
                    },
                    features: {
                        enabled: true,
                        items: [
                            { title: 'Fresh Ingredients', description: 'Sourced daily' },
                            { title: 'Expert Chefs', description: 'Years of experience' },
                            { title: '24/7 Service', description: 'Always available' }
                        ]
                    },
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
                })
            }

            console.error('Homepage fetch error:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json(config)
    } catch (error) {
        console.error('Homepage GET endpoint error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
