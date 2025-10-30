-- Migration: Create billing tables for Wompi payment integration
-- Created: 2025-01-25
-- Description: Tables for subscription plans, subscriptions, payment sources, invoices, and transactions

-- Plans table (subscription plans)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount_in_cents INTEGER NOT NULL CHECK (amount_in_cents > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'COP',
  interval VARCHAR(20) NOT NULL DEFAULT 'month',
  features JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment sources table (tokenized payment methods)
CREATE TABLE IF NOT EXISTS payment_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wompi_id VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('CARD', 'NEQUI', 'PSE')),
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  customer_email VARCHAR(255) NOT NULL,
  last_four VARCHAR(4),
  expires_at TIMESTAMPTZ,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
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

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  amount_in_cents INTEGER NOT NULL CHECK (amount_in_cents > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  wompi_transaction_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  wompi_id VARCHAR(100) NOT NULL UNIQUE,
  amount_in_cents INTEGER NOT NULL CHECK (amount_in_cents > 0),
  status VARCHAR(20) NOT NULL,
  payment_method_type VARCHAR(20) NOT NULL,
  reference VARCHAR(100) NOT NULL,
  status_message TEXT,
  raw_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_sources_workspace ON payment_sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_sources_user ON payment_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sources_wompi_id ON payment_sources(wompi_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_attempt_count ON invoices(attempt_count);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_workspace ON transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wompi_id ON transactions(wompi_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- RLS policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Plans: public read access
CREATE POLICY "Allow public read access to active plans" ON plans
  FOR SELECT USING (is_active = true);

-- Payment sources: users can only access their own
CREATE POLICY "Users can view their own payment sources" ON payment_sources
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payment sources" ON payment_sources
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payment sources" ON payment_sources
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own payment sources" ON payment_sources
  FOR DELETE USING (user_id = auth.uid());

-- Subscriptions: users can only access their own
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- Invoices: users can only access their own
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own invoices" ON invoices
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own invoices" ON invoices
  FOR UPDATE USING (user_id = auth.uid());

-- Transactions: users can only access their own
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_plans_updated_at 
  BEFORE UPDATE ON plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_sources_updated_at 
  BEFORE UPDATE ON payment_sources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default payment source per workspace
CREATE OR REPLACE FUNCTION ensure_single_default_payment_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset all other default payment sources for this workspace
    UPDATE payment_sources 
    SET is_default = false 
    WHERE workspace_id = NEW.workspace_id 
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_payment_source_trigger
  BEFORE INSERT OR UPDATE ON payment_sources
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_payment_source();

-- Insert initial plans
INSERT INTO plans (name, description, amount_in_cents, currency, features) VALUES
(
  'Básico',
  'Perfecto para empezar',
  1900000, -- $19 USD = 1,900,000 COP
  'COP',
  '["200 consultas por mes", "Análisis básico de documentos", "Soporte por email", "Acceso a base de datos legal básica", "Sin subida de documentos"]'::jsonb
),
(
  'Profesional',
  'Para abogados independientes',
  4700000, -- $47 USD = 4,700,000 COP
  'COP',
  '["1,000 consultas por mes", "Subida y análisis de documentos", "Organización en carpetas", "Integración de conocimiento de procesos", "Redacción de contratos", "Soporte prioritario"]'::jsonb
),
(
  'Empresarial',
  'Para firmas de abogados',
  50000000, -- $500 USD = 50,000,000 COP
  'COP',
  '["Consultas ilimitadas", "Todo lo del plan Profesional", "Soluciones a la medida", "Modelos personalizados", "Múltiples usuarios", "API personalizada", "Soporte 24/7", "Capacitación incluida", "Reportes avanzados"]'::jsonb
);





