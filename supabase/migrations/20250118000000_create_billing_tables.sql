-- Migration: Create billing tables for Wompi integration
-- Created: 2025-01-18
-- Description: Tables for subscription billing with Wompi payment sources

-- Plans table (catalog of subscription plans)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  amount_in_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  billing_period VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Payment sources table (saved payment methods from Wompi)
CREATE TABLE payment_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  wompi_id VARCHAR(100) UNIQUE NOT NULL, -- "50624"
  type VARCHAR(20) NOT NULL, -- CARD, NEQUI
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, AVAILABLE, UNAVAILABLE
  brand VARCHAR(50), -- Visa, Mastercard (solo tarjetas)
  last_four VARCHAR(4),
  holder_name VARCHAR(255),
  customer_email VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  three_ds_flags JSONB DEFAULT '{}',
  expires_at DATE, -- solo tarjetas
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Subscriptions table (active subscriptions)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  payment_source_id UUID REFERENCES payment_sources(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, past_due, canceled, trialing
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  billing_day INTEGER DEFAULT 1, -- día del mes (1-28)
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- for credits, prorations, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Invoices table (monthly bills)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
  wompi_transaction_id VARCHAR(100),
  attempt_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Transactions table (Wompi transaction log)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  wompi_id VARCHAR(100) UNIQUE NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  status VARCHAR(20) NOT NULL,
  payment_method_type VARCHAR(20),
  reference VARCHAR(255),
  status_message TEXT,
  response_code VARCHAR(50),
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payment_sources_user ON payment_sources(user_id);
CREATE INDEX idx_payment_sources_workspace ON payment_sources(workspace_id);
CREATE INDEX idx_payment_sources_status ON payment_sources(status);

CREATE INDEX idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_next_retry ON invoices(next_retry_at) WHERE status = 'failed';

CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX idx_transactions_wompi_id ON transactions(wompi_id);
CREATE INDEX idx_transactions_status ON transactions(status);

-- RLS policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Plans: readable by all authenticated users
CREATE POLICY "Plans are viewable by authenticated users" ON plans
  FOR SELECT USING (auth.role() = 'authenticated');

-- Payment sources: users can only see their own
CREATE POLICY "Users can view their own payment sources" ON payment_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment sources" ON payment_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment sources" ON payment_sources
  FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions: users can only see subscriptions for their workspaces
CREATE POLICY "Users can view subscriptions for their workspaces" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = subscriptions.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert subscriptions for their workspaces" ON subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = subscriptions.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update subscriptions for their workspaces" ON subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = subscriptions.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Invoices: users can only see invoices for their workspaces
CREATE POLICY "Users can view invoices for their workspaces" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = invoices.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Transactions: users can only see transactions for their workspaces
CREATE POLICY "Users can view transactions for their workspaces" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = transactions.workspace_id 
      AND workspaces.user_id = auth.uid()
    )
  );

-- Insert some default plans
INSERT INTO plans (name, description, amount_in_cents, features) VALUES
  ('Básico', 'Plan básico para abogados individuales', 150000, '["Chat ilimitado", "5 documentos por mes", "Soporte por email"]'),
  ('Profesional', 'Plan profesional para estudios jurídicos', 300000, '["Chat ilimitado", "Documentos ilimitados", "Soporte prioritario", "Análisis avanzado"]'),
  ('Empresarial', 'Plan empresarial para grandes firmas', 500000, '["Todo del Profesional", "Múltiples usuarios", "API access", "Soporte 24/7"]');


