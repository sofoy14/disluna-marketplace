-- Migration: Update Pedro Ardila's plan to Professional
-- Created: 2025-02-03
-- Description: Change user pedro.ardilaa@javeriana.edu.co from student plan to professional plan

DO $$
DECLARE
  target_user_id UUID;
  professional_plan_id UUID;
  user_subscription_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'pedro.ardilaa@javeriana.edu.co';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email pedro.ardilaa@javeriana.edu.co not found';
  END IF;

  -- Find professional plan (plan_type = 'pro' or name contains 'PRO')
  SELECT id INTO professional_plan_id
  FROM plans
  WHERE (plan_type = 'pro' OR name ILIKE '%pro%' OR name ILIKE '%profesional%')
    AND is_active = true
  ORDER BY sort_order ASC
  LIMIT 1;

  IF professional_plan_id IS NULL THEN
    RAISE EXCEPTION 'Professional plan not found in database';
  END IF;

  -- Find user's active subscription
  SELECT id INTO user_subscription_id
  FROM subscriptions
  WHERE user_id = target_user_id
    AND status IN ('active', 'trialing', 'past_due')
  ORDER BY created_at DESC
  LIMIT 1;

  IF user_subscription_id IS NULL THEN
    -- User doesn't have a subscription, create one
    INSERT INTO subscriptions (
      user_id,
      workspace_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    SELECT 
      target_user_id,
      w.id,
      professional_plan_id,
      'active',
      NOW(),
      NOW() + INTERVAL '1 month',
      false
    FROM workspaces w
    WHERE w.user_id = target_user_id
    ORDER BY w.created_at ASC
    LIMIT 1;
    
    RAISE NOTICE 'Created new professional subscription for user %', target_user_id;
  ELSE
    -- Update existing subscription to professional plan
    UPDATE subscriptions
    SET 
      plan_id = professional_plan_id,
      updated_at = NOW()
    WHERE id = user_subscription_id;
    
    RAISE NOTICE 'Updated subscription % to professional plan for user %', user_subscription_id, target_user_id;
  END IF;

  RAISE NOTICE 'Successfully updated user % to professional plan %', target_user_id, professional_plan_id;
END $$;


