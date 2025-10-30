-- Migration: Create admin tables for audit logs and system metrics
-- Created: 2025-01-26
-- Description: Tables for admin actions auditing and system metrics storage

-- Admin actions table for audit logs
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_email VARCHAR(255) NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'view', 'export', 'suspend', 'activate')),
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('user', 'chat', 'file', 'subscription', 'workspace', 'database')),
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for admin_actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_email ON admin_actions(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_resource_type ON admin_actions(resource_type);

-- System metrics table for storing historical metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(20, 4) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for system_metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);

-- Enable RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Policy to allow only admins to read admin_actions
-- Note: This policy requires the isAdmin function to be implemented in the application layer
CREATE POLICY "Admins can view all admin actions" ON admin_actions
  FOR SELECT
  TO authenticated
  USING (true); -- We'll filter this in the application layer

-- Enable RLS on system_metrics
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Policy to allow only admins to read system_metrics
CREATE POLICY "Admins can view all system metrics" ON system_metrics
  FOR SELECT
  TO authenticated
  USING (true); -- We'll filter this in the application layer

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_email TEXT,
  p_admin_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
BEGIN
  INSERT INTO admin_actions (
    admin_email,
    admin_user_id,
    action_type,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_email,
    p_admin_user_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store system metrics
CREATE OR REPLACE FUNCTION store_system_metric(
  p_metric_type TEXT,
  p_metric_value DECIMAL,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO system_metrics (
    metric_type,
    metric_value,
    metadata
  ) VALUES (
    p_metric_type,
    p_metric_value,
    p_metadata
  ) RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for admin dashboard metrics
CREATE OR REPLACE VIEW admin_dashboard_metrics AS
SELECT 
  (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM users WHERE is_active = false) as inactive_users,
  (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours') as new_users_today,
  (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_this_week,
  (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_this_month,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
  (SELECT COUNT(*) FROM chats WHERE created_at >= NOW() - INTERVAL '24 hours') as chats_today,
  (SELECT COUNT(*) FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours') as messages_today;

-- Grant necessary permissions
GRANT SELECT ON admin_actions TO authenticated;
GRANT SELECT ON system_metrics TO authenticated;
GRANT SELECT ON admin_dashboard_metrics TO authenticated;

COMMENT ON TABLE admin_actions IS 'Logs de auditoría de acciones de administradores';
COMMENT ON TABLE system_metrics IS 'Métricas del sistema almacenadas históricamente';
COMMENT ON FUNCTION log_admin_action IS 'Función para registrar acciones de administradores';
COMMENT ON FUNCTION store_system_metric IS 'Función para almacenar métricas del sistema';
COMMENT ON VIEW admin_dashboard_metrics IS 'Vista con métricas para el dashboard de administración';

