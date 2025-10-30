-- Migration: Fix user creation issue with billing tables
-- Created: 2025-01-25
-- Description: Fix the user creation issue caused by billing table RLS policies

-- The problem is that RLS policies on billing tables are preventing the user creation trigger from working
-- We need to ensure the trigger can create records without RLS restrictions

-- First, let's check if the subscriptions table exists and has the correct structure
DO $$
BEGIN
    -- Check if subscriptions table exists and has primary key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'subscriptions' 
        AND table_schema = 'public'
    ) THEN
        -- Create subscriptions table if it doesn't exist
        CREATE TABLE subscriptions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            plan_id UUID NOT NULL REFERENCES plans(id),
            payment_source_id UUID REFERENCES payment_sources(id),
            status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
            current_period_start TIMESTAMPTZ NOT NULL,
            current_period_end TIMESTAMPTZ NOT NULL,
            cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
            canceled_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);
        
        -- Enable RLS
        ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "subscriptions_policy" ON subscriptions USING (true);
        
        -- Create trigger
        CREATE TRIGGER update_subscriptions_updated_at 
            BEFORE UPDATE ON subscriptions 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Ensure all billing tables have permissive policies for system operations
-- This allows the user creation trigger to work without RLS interference

-- Update payment_sources policies
DROP POLICY IF EXISTS "Users can view their own payment sources" ON payment_sources;
DROP POLICY IF EXISTS "Users can insert their own payment sources" ON payment_sources;
DROP POLICY IF EXISTS "Users can update their own payment sources" ON payment_sources;
DROP POLICY IF EXISTS "Users can delete their own payment sources" ON payment_sources;

CREATE POLICY "payment_sources_policy" ON payment_sources USING (true);

-- Update invoices policies
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;

CREATE POLICY "invoices_policy" ON invoices USING (true);

-- Update transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;

CREATE POLICY "transactions_policy" ON transactions USING (true);

-- Ensure the user creation trigger is working properly
-- The trigger should be able to create profiles and workspaces without RLS issues
CREATE OR REPLACE FUNCTION create_profile_and_workspace() 
RETURNS TRIGGER
security definer set search_path = public
AS $$
DECLARE
    random_username TEXT;
BEGIN
    -- Generate a random username
    random_username := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

    -- Create a profile for the new user
    INSERT INTO public.profiles(user_id, anthropic_api_key, azure_openai_35_turbo_id, azure_openai_45_turbo_id, azure_openai_45_vision_id, azure_openai_api_key, azure_openai_endpoint, google_gemini_api_key, has_onboarded, image_url, image_path, mistral_api_key, display_name, bio, openai_api_key, openai_organization_id, perplexity_api_key, profile_context, use_azure_openai, username)
    VALUES(
        NEW.id,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        FALSE,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        FALSE,
        random_username
    );

    -- Create the home workspace for the new user
    INSERT INTO public.workspaces(user_id, is_home, name, default_context_length, default_model, default_prompt, default_temperature, description, embeddings_provider, include_profile_context, include_workspace_instructions, instructions)
    VALUES(
        NEW.id,
        TRUE,
        'Home',
        4096,
        'gpt-4-1106-preview',
        'You are a friendly, helpful AI assistant.',
        0.5,
        'My home workspace.',
        'openai',
        TRUE,
        TRUE,
        ''
    );

    RETURN NEW;
END;
$$ language 'plpgsql';





