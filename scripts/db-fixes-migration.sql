-- ============================================================
-- Database Fixes Migration
-- Fixes 7 identified issues. Run in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- FIX 1: subscription_payments — add payment_date column
-- Bug: Dashboard billing page queries payment_date + orders by it,
--      but the actual column is paid_at. All dates show as "—".
-- ============================================================
ALTER TABLE public.subscription_payments
    ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Backfill existing rows
UPDATE public.subscription_payments
    SET payment_date = paid_at
    WHERE payment_date IS NULL;

-- Keep payment_date in sync with paid_at going forward
CREATE OR REPLACE FUNCTION sync_subscription_payment_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.payment_date := COALESCE(NEW.payment_date, NEW.paid_at);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_date ON public.subscription_payments;
CREATE TRIGGER trg_sync_payment_date
    BEFORE INSERT OR UPDATE ON public.subscription_payments
    FOR EACH ROW EXECUTE FUNCTION sync_subscription_payment_date();


-- ============================================================
-- FIX 2: users — add email column
-- Bug: Team page selects email from public.users but email only
--      exists in auth.users. All staff emails show as "—".
-- ============================================================
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill from auth.users
UPDATE public.users u
    SET email = au.email
    FROM auth.users au
    WHERE u.id = au.id
      AND u.email IS NULL;

-- Keep email in sync when auth.users is updated (via auth trigger)
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_email ON auth.users;
CREATE TRIGGER trg_sync_user_email
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_user_email();


-- ============================================================
-- FIX 3: promo_videos — add restaurant_id (multi-tenant leak)
-- Bug: promo_videos has no restaurant_id, so all restaurants
--      share the same promo video pool.
-- ============================================================
ALTER TABLE public.promo_videos
    ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;

-- Index for per-restaurant queries
CREATE INDEX IF NOT EXISTS idx_promo_videos_restaurant
    ON public.promo_videos (restaurant_id);

-- Drop the overly-permissive write policies and replace with restaurant-scoped ones
DROP POLICY IF EXISTS "Auth insert promo_videos"   ON public.promo_videos;
DROP POLICY IF EXISTS "Auth update promo_videos"   ON public.promo_videos;
DROP POLICY IF EXISTS "Auth delete promo_videos"   ON public.promo_videos;

CREATE POLICY "Staff can insert own restaurant promo_videos" ON public.promo_videos
    FOR INSERT WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Staff can update own restaurant promo_videos" ON public.promo_videos
    FOR UPDATE USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Staff can delete own restaurant promo_videos" ON public.promo_videos
    FOR DELETE USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.users WHERE id = auth.uid()
        )
    );


-- ============================================================
-- FIX 4: phone_otp_tokens — create missing table
-- Bug: PhoneOtpToken type exists in database.ts but no table.
--      Phone OTP feature will 500 on first use.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.phone_otp_tokens (
    id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    phone         TEXT         NOT NULL,
    otp_code      TEXT         NOT NULL,
    purpose       TEXT         NOT NULL CHECK (purpose IN ('login', 'verify', 'loyalty_signup')),
    restaurant_id UUID         REFERENCES public.restaurants(id) ON DELETE SET NULL,
    expires_at    TIMESTAMPTZ  NOT NULL,
    used          BOOLEAN      DEFAULT false NOT NULL,
    created_at    TIMESTAMPTZ  DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone_purpose
    ON public.phone_otp_tokens (phone, purpose, expires_at)
    WHERE used = false;

ALTER TABLE public.phone_otp_tokens ENABLE ROW LEVEL SECURITY;

-- No direct client access — all reads/writes via service_role in server actions


-- ============================================================
-- FIX 5: updated_at auto-triggers on restaurants and users
-- Bug: updated_at columns exist but are never auto-refreshed.
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER trg_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ============================================================
-- FIX 6: homepage_configs — add public read policy
-- Bug: Only authenticated users can read homepage configs.
--      Public restaurant landing pages use createAdminClient()
--      so this works today, but any future createServerClient()
--      call for the public homepage would return empty.
-- ============================================================
DROP POLICY IF EXISTS "Public read homepage_configs" ON public.homepage_configs;
CREATE POLICY "Public read homepage_configs" ON public.homepage_configs
    FOR SELECT USING (true);


-- ============================================================
-- FIX 7: feedback table — tighten overly-broad SELECT policy
-- Bug: "Service role can read feedback" uses USING(true) which
--      means ANY authenticated user can read ANY restaurant's
--      feedback. Should be scoped to own restaurant.
-- ============================================================
DROP POLICY IF EXISTS "Service role can read feedback" ON public.feedback;

CREATE POLICY "Staff read own restaurant feedback" ON public.feedback
    FOR SELECT
    TO authenticated
    USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.users WHERE id = auth.uid()
        )
    );


-- ============================================================
-- Verification
-- ============================================================
SELECT
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'subscription_payments' AND column_name = 'payment_date') AS fix1_payment_date,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'email')                        AS fix2_user_email,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'promo_videos' AND column_name = 'restaurant_id')         AS fix3_promo_tenant,
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_name = 'phone_otp_tokens')                                       AS fix4_otp_table,
    (SELECT COUNT(*) FROM information_schema.triggers
     WHERE trigger_name = 'trg_restaurants_updated_at')                           AS fix5_updated_at,
    (SELECT COUNT(*) FROM pg_policies
     WHERE tablename = 'homepage_configs' AND policyname = 'Public read homepage_configs') AS fix6_homepage_rls,
    (SELECT COUNT(*) FROM pg_policies
     WHERE tablename = 'feedback' AND policyname = 'Staff read own restaurant feedback')   AS fix7_feedback_rls;
