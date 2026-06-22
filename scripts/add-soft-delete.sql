-- 1. Add is_deleted column to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Update check_plan_limit to ignore deleted items
CREATE OR REPLACE FUNCTION public.check_plan_limit(p_restaurant_id uuid, p_resource text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tier TEXT;
  v_plan subscription_plans;
  v_current_count INTEGER;
  v_max_allowed INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier FROM restaurants WHERE id = p_restaurant_id;
  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_tier;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no plan restrictions');
  END IF;

  CASE p_resource
    WHEN 'menu_items' THEN
      SELECT COUNT(*) INTO v_current_count FROM menu_items WHERE restaurant_id = p_restaurant_id AND is_deleted = false;
      v_max_allowed := v_plan.max_menu_items;
    WHEN 'staff' THEN
      SELECT COUNT(*) INTO v_current_count FROM users WHERE restaurant_id = p_restaurant_id;
      v_max_allowed := v_plan.max_staff;
    WHEN 'tables' THEN
      SELECT COUNT(*) INTO v_current_count FROM tables WHERE restaurant_id = p_restaurant_id;
      v_max_allowed := v_plan.max_tables;
    ELSE
      RETURN jsonb_build_object('allowed', true, 'reason', 'unknown resource');
  END CASE;

  IF v_current_count >= v_max_allowed THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current', v_current_count,
      'max', v_max_allowed,
      'tier', v_tier,
      'reason', format('Your %s plan allows up to %s %s. Please upgrade.', v_tier, v_max_allowed, p_resource)
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'current', v_current_count, 'max', v_max_allowed, 'tier', v_tier);
END;
$function$;
