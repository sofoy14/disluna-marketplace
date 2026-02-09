-- =====================================================
-- SETUP COMPLETO PARA SUPABASE SELF-HOSTED
-- Ejecutar esto en SQL Editor de Supabase Studio
-- =====================================================

-- =====================================================
-- 1. EXTENSIONES NECESARIAS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. FUNCIONES UTILITARIAS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. TABLA WORKSPACES (requerida por otras tablas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_home BOOLEAN NOT NULL DEFAULT false,
    default_context_length INTEGER NOT NULL DEFAULT 4096,
    default_model TEXT NOT NULL DEFAULT 'gpt-4-1106-preview',
    default_prompt TEXT NOT NULL DEFAULT 'You are a friendly, helpful AI assistant.',
    default_temperature REAL NOT NULL DEFAULT 0.5,
    embeddings_provider TEXT NOT NULL DEFAULT 'openai',
    include_profile_context BOOLEAN NOT NULL DEFAULT true,
    include_workspace_instructions BOOLEAN NOT NULL DEFAULT true,
    instructions TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own workspaces" ON workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 4. TABLA PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    bio TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 500),
    has_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT NOT NULL DEFAULT '' CHECK (char_length(image_url) <= 1000),
    image_path TEXT NOT NULL DEFAULT '' CHECK (char_length(image_path) <= 1000),
    profile_context TEXT NOT NULL DEFAULT '' CHECK (char_length(profile_context) <= 1500),
    display_name TEXT NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 100),
    use_azure_openai BOOLEAN NOT NULL DEFAULT FALSE,
    username TEXT NOT NULL UNIQUE CHECK (char_length(username) >= 3 AND char_length(username) <= 25),
    -- Campos opcionales
    anthropic_api_key TEXT CHECK (char_length(anthropic_api_key) <= 1000),
    azure_openai_35_turbo_id TEXT CHECK (char_length(azure_openai_35_turbo_id) <= 1000),
    azure_openai_45_turbo_id TEXT CHECK (char_length(azure_openai_45_turbo_id) <= 1000),
    azure_openai_45_vision_id TEXT CHECK (char_length(azure_openai_45_vision_id) <= 1000),
    azure_openai_api_key TEXT CHECK (char_length(azure_openai_api_key) <= 1000),
    azure_openai_endpoint TEXT CHECK (char_length(azure_openai_endpoint) <= 1000),
    google_gemini_api_key TEXT CHECK (char_length(google_gemini_api_key) <= 1000),
    mistral_api_key TEXT CHECK (char_length(mistral_api_key) <= 1000),
    openai_api_key TEXT CHECK (char_length(openai_api_key) <= 1000),
    openai_organization_id TEXT CHECK (char_length(openai_organization_id) <= 1000),
    perplexity_api_key TEXT CHECK (char_length(perplexity_api_key) <= 1000),
    -- NUEVO: onboarding_step
    onboarding_step INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own profiles" ON profiles
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 5. TABLA PLANS (Billing)
-- =====================================================
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
    plan_type VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
    max_output_tokens_monthly INTEGER NOT NULL DEFAULT -1,
    max_processes INTEGER NOT NULL DEFAULT 5,
    max_transcription_hours INTEGER NOT NULL DEFAULT 0,
    has_multiple_workspaces BOOLEAN NOT NULL DEFAULT false,
    has_processes BOOLEAN NOT NULL DEFAULT true,
    has_transcriptions BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_period ON plans(billing_period);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are viewable by everyone" ON plans FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at 
    BEFORE UPDATE ON plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar planes por defecto
INSERT INTO public.plans (
    name, description, amount_in_cents, currency, billing_period, 
    features, query_limit, sort_order, is_active, plan_type,
    max_output_tokens_monthly, max_processes, max_transcription_hours,
    has_multiple_workspaces, has_processes, has_transcriptions
) VALUES 
('Básico', 'Plan básico para empezar', 99000, 'COP', 'monthly', 
 ARRAY['100 consultas/mes', '5 procesos', 'Soporte básico'], 100, 1, true, 'basic',
 100000, 5, 0, false, true, false),
('Básico Anual', 'Plan básico con descuento anual', 990000, 'COP', 'yearly',
 ARRAY['100 consultas/mes', '5 procesos', 'Soporte básico', '2 meses gratis'], 100, 2, true, 'basic',
 100000, 5, 0, false, true, false),
('Profesional', 'Para profesionales del derecho', 299000, 'COP', 'monthly',
 ARRAY['500 consultas/mes', 'Procesos ilimitados', 'Soporte prioritario', 'Múltiples workspaces'], 500, 3, true, 'pro',
 500000, -1, 10, true, true, true),
('Profesional Anual', 'Plan profesional con descuento anual', 2990000, 'COP', 'yearly',
 ARRAY['500 consultas/mes', 'Procesos ilimitados', 'Soporte prioritario', 'Múltiples workspaces', '2 meses gratis'], 500, 4, true, 'pro',
 500000, -1, 10, true, true, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. TABLA SPECIAL_OFFERS
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_special_offers_code ON special_offers(code);
ALTER TABLE special_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Special offers are viewable by everyone" ON special_offers FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_special_offers_updated_at ON special_offers;
CREATE TRIGGER update_special_offers_updated_at 
    BEFORE UPDATE ON special_offers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. TABLAS DE BILLING ADICIONALES
-- =====================================================

-- Payment Sources
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
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_sources_policy" ON payment_sources USING (true);

-- Subscriptions
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
    billing_day INTEGER CHECK (billing_day >= 1 AND billing_day <= 31),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_policy" ON subscriptions USING (true);

-- Invoices
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
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_policy" ON invoices USING (true);

-- Transactions
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
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_policy" ON transactions USING (true);

-- =====================================================
-- 8. TRIGGER PARA CREAR PROFILE Y WORKSPACE AL REGISTRARSE
-- =====================================================
CREATE OR REPLACE FUNCTION create_profile_and_workspace() 
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    random_username TEXT;
BEGIN
    random_username := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

    INSERT INTO public.profiles(
        user_id, anthropic_api_key, azure_openai_35_turbo_id, azure_openai_45_turbo_id, 
        azure_openai_45_vision_id, azure_openai_api_key, azure_openai_endpoint, 
        google_gemini_api_key, has_onboarded, image_url, image_path, mistral_api_key, 
        display_name, bio, openai_api_key, openai_organization_id, perplexity_api_key, 
        profile_context, use_azure_openai, username
    ) VALUES(
        NEW.id, '', '', '', '', '', '', '', FALSE, '', '', '', '', '', '', '', '', '', FALSE, random_username
    );

    INSERT INTO public.workspaces(
        user_id, is_home, name, default_context_length, default_model, 
        default_prompt, default_temperature, description, embeddings_provider, 
        include_profile_context, include_workspace_instructions, instructions
    ) VALUES(
        NEW.id, TRUE, 'Home', 4096, 'gpt-4-1106-preview',
        'You are a friendly, helpful AI assistant.', 0.5, 'My home workspace.',
        'openai', TRUE, TRUE, ''
    );

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Crear el trigger
DROP TRIGGER IF EXISTS create_profile_and_workspace_trigger ON auth.users;
CREATE TRIGGER create_profile_and_workspace_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.create_profile_and_workspace();

-- =====================================================
-- 9. TABLAS ADICIONALES NECESARIAS
-- =====================================================

-- Chats
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'New Chat',
    model TEXT NOT NULL DEFAULT 'gpt-4-1106-preview',
    prompt TEXT,
    temperature REAL NOT NULL DEFAULT 0.5,
    context_length INTEGER NOT NULL DEFAULT 4096,
    include_profile_context BOOLEAN NOT NULL DEFAULT true,
    include_workspace_instructions BOOLEAN NOT NULL DEFAULT true,
    embeddings_provider TEXT NOT NULL DEFAULT 'openai',
    folder_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own chats" ON chats
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    model TEXT,
    sequence_number INTEGER NOT NULL,
    image_paths TEXT[] DEFAULT '{}',
    file_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own messages" ON messages
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Presets
CREATE TABLE IF NOT EXISTS public.presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    context_length INTEGER NOT NULL DEFAULT 4096,
    model TEXT NOT NULL DEFAULT 'gpt-4-1106-preview',
    prompt TEXT NOT NULL,
    temperature REAL NOT NULL DEFAULT 0.5,
    embeddings_provider TEXT NOT NULL DEFAULT 'openai',
    include_profile_context BOOLEAN NOT NULL DEFAULT true,
    include_workspace_instructions BOOLEAN NOT NULL DEFAULT true,
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own presets" ON presets
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Prompts
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    folder_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own prompts" ON prompts
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Files
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    tokens INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own files" ON files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Folders
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'chats',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own folders" ON folders
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- ¡SETUP COMPLETO!
-- =====================================================
SELECT '✅ Setup completado exitosamente!' as status;
