-- ============================================================
-- Targeted DB Fixes — based on actual DB state (2026-05-28)
-- ============================================================

-- ============================================================
-- 1. Create subscription_payments table (missing entirely)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id  UUID         NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    amount         NUMERIC(10, 2) NOT NULL,
    payment_method TEXT         NOT NULL,
    reference_code TEXT,
    notes          TEXT,
    recorded_by    UUID         REFERENCES auth.users(id),
    paid_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    payment_date   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access subscription_payments" ON public.subscription_payments;
CREATE POLICY "Super admin full access subscription_payments"
    ON public.subscription_payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON r.id = u.role_id
            WHERE u.id = auth.uid() AND r.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Owner can view own subscription_payments" ON public.subscription_payments;
CREATE POLICY "Owner can view own subscription_payments"
    ON public.subscription_payments FOR SELECT
    USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_subscription_payments_restaurant
    ON public.subscription_payments (restaurant_id, paid_at DESC);


-- ============================================================
-- 2. Create promo_videos table (missing entirely)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_videos (
    id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id  UUID         NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    video_url      TEXT         NOT NULL,
    title          TEXT         DEFAULT '',
    display_order  INT          DEFAULT 0,
    created_at     TIMESTAMPTZ  DEFAULT now()
);

ALTER TABLE public.promo_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read promo_videos"                       ON public.promo_videos;
DROP POLICY IF EXISTS "Staff can insert own restaurant promo_videos"   ON public.promo_videos;
DROP POLICY IF EXISTS "Staff can update own restaurant promo_videos"   ON public.promo_videos;
DROP POLICY IF EXISTS "Staff can delete own restaurant promo_videos"   ON public.promo_videos;

CREATE POLICY "Public read promo_videos" ON public.promo_videos
    FOR SELECT USING (true);

CREATE POLICY "Staff can insert own restaurant promo_videos" ON public.promo_videos
    FOR INSERT WITH CHECK (
        restaurant_id IN (SELECT restaurant_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Staff can update own restaurant promo_videos" ON public.promo_videos
    FOR UPDATE USING (
        restaurant_id IN (SELECT restaurant_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Staff can delete own restaurant promo_videos" ON public.promo_videos
    FOR DELETE USING (
        restaurant_id IN (SELECT restaurant_id FROM public.users WHERE id = auth.uid())
    );

CREATE INDEX IF NOT EXISTS idx_promo_videos_restaurant
    ON public.promo_videos (restaurant_id, display_order);


-- ============================================================
-- 3. Add email column to users (missing)
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.users u
    SET email = au.email
    FROM auth.users au
    WHERE u.id = au.id AND u.email IS NULL;

CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_email ON auth.users;
CREATE TRIGGER trg_sync_user_email
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();


-- ============================================================
-- 4. updated_at auto-triggers on key tables
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER trg_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================
-- 5. Fix feedback RLS — scope reads to own restaurant
-- ============================================================
DROP POLICY IF EXISTS "Service role can read feedback"        ON public.feedback;
DROP POLICY IF EXISTS "Staff read own restaurant feedback"    ON public.feedback;

CREATE POLICY "Staff read own restaurant feedback"
    ON public.feedback FOR SELECT TO authenticated
    USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.users WHERE id = auth.uid()
        )
    );


-- ============================================================
-- 6. Fix homepage_configs — add public read policy
-- ============================================================
DROP POLICY IF EXISTS "Public read homepage_configs" ON public.homepage_configs;
CREATE POLICY "Public read homepage_configs"
    ON public.homepage_configs FOR SELECT USING (true);


-- ============================================================
-- 7. JWT Custom Claims Hook function
-- After running: Dashboard → Auth → Hooks → Custom Access Token
--   → select public.custom_access_token_hook
-- ============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    claims          JSONB;
    v_user_id       UUID;
    v_restaurant_id UUID;
    v_role_name     TEXT;
BEGIN
    v_user_id := (event->>'user_id')::UUID;
    claims    := event->'claims';

    SELECT u.restaurant_id, r.name
    INTO   v_restaurant_id, v_role_name
    FROM   public.users u
    LEFT JOIN public.roles r ON r.id = u.role_id
    WHERE  u.id = v_user_id AND u.is_active = true
    LIMIT  1;

    IF v_restaurant_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{app_role}',      to_jsonb(v_role_name));
        claims := jsonb_set(claims, '{restaurant_id}', to_jsonb(v_restaurant_id::TEXT));
    ELSE
        claims := jsonb_set(claims, '{app_role}',      '"unauthenticated"');
        claims := jsonb_set(claims, '{restaurant_id}', 'null');
    END IF;

    RETURN jsonb_build_object('claims', claims);
END;
$$;

GRANT USAGE  ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.users  TO supabase_auth_admin;
GRANT SELECT ON public.roles  TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;


-- ============================================================
-- Verify all 7 fixes applied
-- ============================================================
SELECT
    (SELECT COUNT(*) FROM information_schema.tables   WHERE table_name = 'subscription_payments') AS "1_subscription_payments",
    (SELECT COUNT(*) FROM information_schema.tables   WHERE table_name = 'promo_videos')           AS "2_promo_videos",
    (SELECT COUNT(*) FROM information_schema.columns  WHERE table_name = 'users' AND column_name = 'email') AS "3_users_email",
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'trg_restaurants_updated_at')    AS "4_updated_at_trigger",
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'Staff read own restaurant feedback') AS "5_feedback_rls",
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'homepage_configs' AND policyname = 'Public read homepage_configs') AS "6_homepage_rls",
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'custom_access_token_hook') AS "7_jwt_hook";
