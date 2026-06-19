import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/restaurants?name=ilike.*House*&select=id,name`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  
  if (!res.ok) throw new Error(await res.text());
  const restaurants = await res.json();
  if (!restaurants || restaurants.length === 0) return;
  const house = restaurants[0];

  const premiumGallery = [
    {
      image_url: 'https://videos.pexels.com/video-files/853789/853789-hd_1920_1080_25fps.mp4',
      caption: 'A vibrant cafe atmosphere',
      media_type: 'video'
    },
    {
      image_url: 'https://videos.pexels.com/video-files/2822238/2822238-uhd_2560_1440_24fps.mp4',
      caption: 'Espresso pour',
      media_type: 'video'
    },
    {
      image_url: 'https://videos.pexels.com/video-files/3196238/3196238-uhd_3840_2160_25fps.mp4',
      caption: 'Chef preparing meals',
      media_type: 'video'
    },
    {
      image_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop',
      caption: 'Freshly brewed coffee',
      media_type: 'image'
    },
    {
      image_url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2071&auto=format&fit=crop',
      caption: 'Artisan pastries',
      media_type: 'image'
    },
    {
      image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop',
      caption: 'Cozy interiors',
      media_type: 'image'
    },
    {
      image_url: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=2070&auto=format&fit=crop',
      caption: 'Gourmet plates',
      media_type: 'image'
    }
  ];

  const updateRes = await fetch(`${supabaseUrl}/rest/v1/homepage_configs?restaurant_id=eq.${house.id}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ gallery: premiumGallery })
  });
  if (!updateRes.ok) throw new Error(await updateRes.text());
}
run().catch(console.error);
