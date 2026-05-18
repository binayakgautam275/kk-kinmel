-- Create homepage_configs table for storing restaurant homepage customizations
create table if not exists public.homepage_configs (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  template text not null default 'modern' check (template in ('modern', 'elegant', 'vibrant', 'minimal', 'classic')),
  
  -- Theme colors
  theme_primary text default '#3B82F6',
  theme_secondary text default '#1F2937',
  theme_accent text default '#EC4899',
  
  -- Hero section
  hero_title text default 'Welcome to Our Restaurant',
  hero_subtitle text default 'Discover delicious food',
  hero_cta_text text default 'View Menu',
  hero_image_url text,
  hero_video_url text,
  
  -- About section (stored as JSONB for flexibility)
  about jsonb default '{"enabled": true, "title": "About Us", "description": "Quality food and excellent service since day one.", "image_url": ""}'::jsonb,
  
  -- Features section (stored as JSONB array)
  features jsonb default '[{"title": "Fresh Ingredients", "description": "Sourced daily"}, {"title": "Expert Chefs", "description": "Years of experience"}, {"title": "24/7 Service", "description": "Always available"}]'::jsonb,
  
  -- CTA section (stored as JSONB)
  cta jsonb default '{"enabled": true, "headline": "Order Now", "description": "Get your favorite meal delivered", "button_text": "Start Ordering"}'::jsonb,
  
  -- Footer section (stored as JSONB)
  footer jsonb default '{"enabled": true, "copyright": "© 2024 Your Restaurant", "social_links": []}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(restaurant_id)
);

-- Create index for faster restaurant lookups
create index if not exists idx_homepage_configs_restaurant_id on public.homepage_configs(restaurant_id);

-- Enable RLS
alter table public.homepage_configs enable row level security;

-- RLS Policy: Users can only view/edit their own restaurant's homepage config
create policy "Users can view own restaurant homepage config" on public.homepage_configs
  for select
  using (
    restaurant_id in (
      select restaurant_id from public.users where id = auth.uid()
    )
  );

create policy "Users can update own restaurant homepage config" on public.homepage_configs
  for update
  using (
    restaurant_id in (
      select restaurant_id from public.users where id = auth.uid()
    )
  );

create policy "Users can insert homepage config for own restaurant" on public.homepage_configs
  for insert
  with check (
    restaurant_id in (
      select restaurant_id from public.users where id = auth.uid()
    )
  );

-- Public customers can view any restaurant's homepage config (no RLS restriction)
-- This is handled at the application level through the GET /api/homepage/get endpoint
