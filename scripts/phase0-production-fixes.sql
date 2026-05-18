-- ============================================================
-- Phase 0: Production Critical Fixes
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 0.2: Create 'uploads' storage bucket for payment screenshots
--      and homepage media (images/videos)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (thumbnails shown to staff/admin)
CREATE POLICY IF NOT EXISTS "Public read uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

-- Allow authenticated users to upload (customer payment screenshots via client)
CREATE POLICY IF NOT EXISTS "Auth insert uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Allow service role to upload (server actions use createAdminClient)
-- Note: service role bypasses RLS on tables but still needs storage policies
CREATE POLICY IF NOT EXISTS "Service role insert uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads');


-- ------------------------------------------------------------
-- 0.3: Add screenshot_url column to payment_verifications
--      (column was referenced in code but never migrated)
-- ------------------------------------------------------------
ALTER TABLE public.payment_verifications
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;


-- ------------------------------------------------------------
-- 2.3: Performance indexes for 30-restaurant scale
--      Using CONCURRENTLY to avoid table locks
-- ------------------------------------------------------------

-- Orders: most queries filter by restaurant + status + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_status_placed
  ON public.orders (restaurant_id, status, placed_at DESC);

-- Orders: analytics revenue queries (restaurant + status + date range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_placed
  ON public.orders (restaurant_id, placed_at DESC);

-- Sessions: dashboard active session count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_restaurant_status
  ON public.sessions (restaurant_id, status);

-- Payment verifications: admin panel real-time list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_verifications_restaurant_created
  ON public.payment_verifications (restaurant_id, created_at DESC);

-- Order items: join from orders to items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order
  ON public.order_items (order_id);

-- Menu items: most queries filter by restaurant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_restaurant_category
  ON public.menu_items (restaurant_id, category_id);

-- Users: staff list queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_restaurant_active
  ON public.users (restaurant_id, is_active);


-- ------------------------------------------------------------
-- 2.1: Subscription payments table (manual billing workflow)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  amount       NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,  -- 'cash' | 'esewa' | 'khalti' | 'bank_transfer'
  reference_code TEXT,
  paid_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by  UUID REFERENCES auth.users(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Super admin full access subscription_payments"
  ON public.subscription_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'super_admin'
    )
  );


-- ------------------------------------------------------------
-- Verify everything ran correctly
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'uploads')      AS uploads_bucket_exists,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'payment_verifications'
   AND column_name = 'screenshot_url')                              AS screenshot_url_column_exists,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'subscription_payments')                      AS subscription_payments_table_exists;
