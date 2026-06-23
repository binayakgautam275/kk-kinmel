import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
    request: Request,
    context: { params: Promise<{ restaurantId: string }> }
) {
    const { restaurantId } = await context.params
    const { searchParams } = new URL(request.url)
    const supabase = await createAdminClient()
    
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, logo_url, slug')
        .eq('id', restaurantId)
        .single()
        
    const startUrl = searchParams.get('start_url') || (restaurant?.slug ? `/r/${restaurant.slug}` : '/')
        
    // Fetch theme config (if it's tied to the restaurant, although currently it seems global/single-tenant)
    // We will just fetch the latest theme settings
    const { data: theme } = await supabase
        .from('settings')
        .select('theme')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        
    const themeColor = theme?.theme?.primaryColor || '#FB6303'
    const name = restaurant?.name || 'kkkhane'
    const shortName = name.length > 12 ? name.substring(0, 12) : name
    const logoUrl = restaurant?.logo_url || '/icons/icon-512x512.png'
    
    return NextResponse.json({
      name,
      short_name: shortName,
      theme_color: themeColor,
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      start_url: startUrl,
      description: `Order from ${name}`,
      icons: [
        {
          src: logoUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: logoUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    })
}
