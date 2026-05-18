-- Phase 4.2: Customer Feedback Collection
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.feedback (
    id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID         NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id      UUID         REFERENCES public.orders(id) ON DELETE SET NULL,
    rating        SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT         CHECK (char_length(comment) <= 500),
    created_at    TIMESTAMPTZ  DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_feedback_restaurant_created
    ON public.feedback (restaurant_id, created_at DESC);

-- RLS: public insert (customers don't have auth), admin read
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
    ON public.feedback FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can read feedback"
    ON public.feedback FOR SELECT
    USING (true);

-- Phase 4.4: add max_tables to restaurants if missing
ALTER TABLE public.restaurants
    ADD COLUMN IF NOT EXISTS max_tables INTEGER NOT NULL DEFAULT 20;

-- Set tier defaults for existing rows
UPDATE public.restaurants SET max_tables = CASE subscription_tier
    WHEN 'free'       THEN 10
    WHEN 'basic'      THEN 20
    WHEN 'pro'        THEN 50
    WHEN 'enterprise' THEN 999
    ELSE 20
END WHERE max_tables = 20;
