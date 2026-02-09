-- Migration: Initialize Billing Tables for Self-Hosted Supabase
-- Created: 2025-02-08
-- Description: Create missing billing tables (plans, special_offers) and add onboarding_step column

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount_in_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    features TEXT[] DEFAULT '{}',
    query_limit INTEGER NOT NULL DEFAULT 100,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- New plan feature fields
    plan_type VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
    max_output_tokens_monthly INTEGER NOT NULL DEFAULT -1, -- -1 = unlimited
    max_processes INTEGER NOT NULL DEFAULT 5,
    max_transcription_hours INTEGER NOT NULL DEFAULT 0,
    has_multiple_workspaces BOOLEAN NOT NULL DEFAULT false,
    has_processes BOOLEAN NOT NULL DEFAULT true,
    has_transcriptions BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes for plans
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_period ON plans(billing_period);
CREATE INDEX IF NOT EXISTS idx_plans_sort ON plans(sort_order);

-- Enable RLS on plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans are readable by everyone
CREATE POLICY "Plans are viewable by everyone" ON plans 
    FOR SELECT USING (true);

-- Only admins can modify plans
CREATE POLICY "Only admins can insert plans" ON plans 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
CREATE POLICY "Only admins can update plans" ON plans 
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at on plans
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at 
    BEFORE UPDATE ON plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default plans
INSERT INTO public.plans (
    name, 
    description, 
    amount_in_cents, 
    currency, 
    billing_period, 
    features, 
    query_limit, 
    sort_order, 
    is_active,
    plan_type,
    max_output_tokens_monthly,
    max_processes,
    max_transcription_hours,
    has_multiple_workspaces,
    has_processes,
    has_transcriptions
) VALUES 
-- Basic Monthly
(
    'Básico',
    'Plan básico para empezar',
    99000,
    'COP',
    'monthly',
    ARRAY['100 consultas/mes', '5 procesos', 'Soporte básico'],
    100,
    1,
    true,
    'basic',
    100000,
    5,
    0,
    false,
    true,
    false
),
-- Basic Yearly
(
    'Básico Anual',
    'Plan básico con descuento anual',
    990000,
    'COP',
    'yearly',
    ARRAY['100 consultas/mes', '5 procesos', 'Soporte básico', '2 meses gratis'],
    100,
    2,
    true,
    'basic',
    100000,
    5,
    0,
    false,
    true,
    false
),
-- Pro Monthly
(
    'Profesional',
    'Para profesionales del derecho',
    299000,
    'COP',
    'monthly',
    ARRAY['500 consultas/mes', 'Procesos ilimitados', 'Soporte prioritario', 'Múltiples workspaces'],
    500,
    3,
    true,
    'pro',
    500000,
    -1,
    10,
    true,
    true,
    true
),
-- Pro Yearly
(
    'Profesional Anual',
    'Plan profesional con descuento anual',
    2990000,
    'COP',
    'yearly',
    ARRAY['500 consultas/mes', 'Procesos ilimitados', 'Soporte prioritario', 'Múltiples workspaces', '2 meses gratis'],
    500,
    4,
    true,
    'pro',
    500000,
    -1,
    10,
    true,
    true,
    true
),
-- Enterprise
(
    'Empresarial',
    'Para bufetes y empresas',
    0,
    'COP',
    'monthly',
    ARRAY['Consultas ilimitadas', 'Todo incluido', 'Soporte dedicado', 'Personalización'],
    -1,
    5,
    true,
    'enterprise',
    -1,
    -1,
    -1,
    true,
    true,
    true
)
ON CONFLICT DO NOTHING;

-- Create special_offers table
CREATE TABLE IF NOT EXISTS public.special_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percent INTEGER NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount_cents INTEGER,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for special_offers
CREATE INDEX IF NOT EXISTS idx_special_offers_code ON special_offers(code);
CREATE INDEX IF NOT EXISTS idx_special_offers_active ON special_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_special_offers_dates ON special_offers(valid_from, valid_until);

-- Enable RLS on special_offers
ALTER TABLE special_offers ENABLE ROW LEVEL SECURITY;

-- Special offers are readable by everyone
CREATE POLICY "Special offers are viewable by everyone" ON special_offers 
    FOR SELECT USING (true);

-- Create trigger for updated_at on special_offers
DROP TRIGGER IF EXISTS update_special_offers_updated_at ON special_offers;
CREATE TRIGGER update_special_offers_updated_at 
    BEFORE UPDATE ON special_offers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add onboarding_step column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'onboarding_step'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_step INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Create index for onboarding_step
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);

-- Create payment_sources table if not exists
CREATE TABLE IF NOT EXISTS public.payment_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'nequi', 'pse')),
    wompi_token VARCHAR(255),
    wompi_source_id VARCHAR(255),
    last_four VARCHAR(4),
    brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    card_holder VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for payment_sources
CREATE INDEX IF NOT EXISTS idx_payment_sources_user ON payment_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sources_workspace ON payment_sources(workspace_id);

-- Enable RLS on payment_sources
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_sources_policy" ON payment_sources USING (true);

-- Create trigger for updated_at on payment_sources
DROP TRIGGER IF EXISTS update_payment_sources_updated_at ON payment_sources;
CREATE TRIGGER update_payment_sources_updated_at 
    BEFORE UPDATE ON payment_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create invoices table if not exists
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    subscription_id UUID,
    amount_in_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    description TEXT,
    wompi_transaction_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_policy" ON invoices USING (true);

-- Create trigger for updated_at on invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create transactions table if not exists
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount_in_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'error', 'voided')),
    payment_method VARCHAR(50),
    wompi_transaction_id VARCHAR(255),
    wompi_reference VARCHAR(255),
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_workspace ON transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_wompi ON transactions(wompi_transaction_id);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_policy" ON transactions USING (true);

-- Create trigger for updated_at on transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create subscriptions table if not exists
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    payment_source_id UUID REFERENCES payment_sources(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_policy" ON subscriptions USING (true);

-- Create trigger for updated_at on subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
