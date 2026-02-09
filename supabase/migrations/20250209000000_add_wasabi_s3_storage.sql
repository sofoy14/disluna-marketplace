-- ============================================================
-- Migration: 20250209000000_add_wasabi_s3_storage.sql
-- Description: Add Wasabi S3 storage support and quota system
-- ============================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add storage columns to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;

-- Create index for storage_key lookups
CREATE INDEX IF NOT EXISTS idx_files_storage_key ON files(storage_key) 
WHERE storage_key IS NOT NULL;

-- 2. Add storage columns to process_documents table
ALTER TABLE process_documents 
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;

-- Create index for storage_key lookups
CREATE INDEX IF NOT EXISTS idx_process_docs_storage_key ON process_documents(storage_key) 
WHERE storage_key IS NOT NULL;

-- 3. Create storage_quotas table
CREATE TABLE IF NOT EXISTS storage_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Plan limits
    storage_limit_bytes BIGINT NOT NULL DEFAULT 0,  -- 0 = no storage, -1 = unlimited
    
    -- Current usage
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    documents_count INTEGER NOT NULL DEFAULT 0,
    
    -- Billing period
    period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT storage_quotas_user_period_unique UNIQUE (user_id, period_start),
    CONSTRAINT storage_quotas_used_not_negative CHECK (storage_used_bytes >= 0),
    CONSTRAINT storage_quotas_docs_not_negative CHECK (documents_count >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_storage_quotas_user ON storage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_quotas_period ON storage_quotas(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_storage_quotas_active ON storage_quotas(user_id, period_start, period_end) 
WHERE period_start <= NOW() AND period_end > NOW();

-- 4. Add max_storage_bytes to plans table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS max_storage_bytes BIGINT DEFAULT 0;

-- Update existing plans with storage limits
-- Basic: 0 bytes (no file storage)
UPDATE plans SET max_storage_bytes = 0 WHERE plan_type = 'basic' AND max_storage_bytes = 0;
-- Pro: 1 GB (1073741824 bytes)
UPDATE plans SET max_storage_bytes = 1073741824 WHERE plan_type = 'pro' AND max_storage_bytes = 0;
-- Enterprise: -1 (unlimited)
UPDATE plans SET max_storage_bytes = -1 WHERE plan_type = 'enterprise' AND max_storage_bytes = 0;

-- Add comment
COMMENT ON COLUMN plans.max_storage_bytes IS 'Storage limit in bytes. 0 = no storage, -1 = unlimited';

-- 5. Add storage columns to usage_tracking table
ALTER TABLE usage_tracking 
ADD COLUMN IF NOT EXISTS storage_bytes_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_bytes_limit BIGINT DEFAULT 0;

-- 6. Enable RLS on storage_quotas
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;

-- Users can view their own quotas
CREATE POLICY "Users can view own storage quotas"
    ON storage_quotas FOR SELECT
    USING (auth.uid() = user_id);

-- System can manage all quotas (for triggers and functions)
CREATE POLICY "System can manage storage quotas"
    ON storage_quotas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_storage_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_storage_quotas_updated_at ON storage_quotas;
CREATE TRIGGER update_storage_quotas_updated_at
    BEFORE UPDATE ON storage_quotas
    FOR EACH ROW EXECUTE FUNCTION update_storage_quotas_updated_at();

-- 8. Function to check storage quota before upload
CREATE OR REPLACE FUNCTION check_storage_quota(
    p_user_id UUID,
    p_requested_bytes BIGINT
) RETURNS TABLE (
    allowed BOOLEAN,
    current_usage BIGINT,
    limit_bytes BIGINT,
    remaining_bytes BIGINT,
    message TEXT
) AS $$
DECLARE
    v_current_usage BIGINT := 0;
    v_limit BIGINT := 0;
    v_remaining BIGINT := 0;
    v_plan_name TEXT;
BEGIN
    -- Get or create quota record for current period
    SELECT COALESCE(sq.storage_used_bytes, 0), sq.storage_limit_bytes
    INTO v_current_usage, v_limit
    FROM storage_quotas sq
    WHERE sq.user_id = p_user_id
      AND sq.period_start <= NOW()
      AND sq.period_end > NOW();
    
    -- If no quota record exists, get from plan
    IF v_limit IS NULL OR v_limit = 0 THEN
        SELECT COALESCE(p.max_storage_bytes, 0), p.name
        INTO v_limit, v_plan_name
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = p_user_id
          AND s.status IN ('active', 'trialing')
          AND s.current_period_end > NOW()
        ORDER BY s.created_at DESC
        LIMIT 1;
        
        -- Create quota record if subscription exists
        IF v_limit IS NOT NULL THEN
            INSERT INTO storage_quotas (
                user_id,
                storage_limit_bytes,
                period_start,
                period_end
            )
            SELECT 
                p_user_id,
                COALESCE(p.max_storage_bytes, 0),
                s.current_period_start,
                s.current_period_end
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = p_user_id
              AND s.status IN ('active', 'trialing')
            ORDER BY s.created_at DESC
            LIMIT 1
            ON CONFLICT (user_id, period_start) DO NOTHING;
        END IF;
    END IF;
    
    -- Default to 0 if no subscription
    IF v_limit IS NULL THEN
        v_limit := 0;
    END IF;
    
    -- Calculate remaining
    IF v_limit = -1 THEN
        v_remaining := -1;
    ELSE
        v_remaining := GREATEST(0, v_limit - v_current_usage);
    END IF;
    
    -- Check if upload is allowed
    IF v_limit = -1 THEN
        RETURN QUERY SELECT 
            TRUE,
            v_current_usage,
            v_limit,
            -1::BIGINT,
            'Almacenamiento ilimitado'::TEXT;
    ELSIF (v_current_usage + p_requested_bytes) <= v_limit THEN
        RETURN QUERY SELECT 
            TRUE,
            v_current_usage,
            v_limit,
            v_remaining,
            format('Espacio disponible: %s de %s', 
                   pg_size_pretty(v_current_usage + p_requested_bytes),
                   pg_size_pretty(v_limit))::TEXT;
    ELSE
        RETURN QUERY SELECT 
            FALSE,
            v_current_usage,
            v_limit,
            GREATEST(0, v_remaining),
            format('Has alcanzado tu límite de almacenamiento. Usado: %s de %s. ', 
                   pg_size_pretty(v_current_usage),
                   pg_size_pretty(v_limit)) ||
            'Actualiza tu plan para más espacio.'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to increment storage usage
CREATE OR REPLACE FUNCTION increment_storage_usage(
    p_user_id UUID,
    p_bytes BIGINT
) RETURNS VOID AS $$
DECLARE
    v_quota_id UUID;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Get current quota record
    SELECT sq.id, sq.period_end
    INTO v_quota_id, v_period_end
    FROM storage_quotas sq
    WHERE sq.user_id = p_user_id
      AND sq.period_start <= NOW()
      AND sq.period_end > NOW();
    
    -- If no record or expired, create new
    IF v_quota_id IS NULL OR v_period_end < NOW() THEN
        INSERT INTO storage_quotas (
            user_id,
            storage_limit_bytes,
            period_start,
            period_end
        )
        SELECT 
            p_user_id,
            COALESCE(p.max_storage_bytes, 0),
            s.current_period_start,
            s.current_period_end
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = p_user_id
          AND s.status IN ('active', 'trialing')
        ORDER BY s.created_at DESC
        LIMIT 1
        ON CONFLICT (user_id, period_start) DO UPDATE
        SET storage_limit_bytes = EXCLUDED.storage_limit_bytes
        RETURNING id INTO v_quota_id;
    END IF;
    
    -- Update usage
    IF v_quota_id IS NOT NULL THEN
        UPDATE storage_quotas
        SET storage_used_bytes = storage_used_bytes + p_bytes,
            documents_count = documents_count + 1
        WHERE id = v_quota_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to decrement storage usage
CREATE OR REPLACE FUNCTION decrement_storage_usage(
    p_user_id UUID,
    p_bytes BIGINT
) RETURNS VOID AS $$
BEGIN
    UPDATE storage_quotas
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - p_bytes),
        documents_count = GREATEST(0, documents_count - 1)
    WHERE user_id = p_user_id
      AND period_start <= NOW()
      AND period_end > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Trigger function for document insertion
CREATE OR REPLACE FUNCTION handle_document_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update quota for Wasabi storage
    IF NEW.storage_provider = 'wasabi' AND NEW.size_bytes > 0 THEN
        PERFORM increment_storage_usage(NEW.user_id, NEW.size_bytes);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger function for document deletion
CREATE OR REPLACE FUNCTION handle_document_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update quota for Wasabi storage
    IF OLD.storage_provider = 'wasabi' AND OLD.size_bytes > 0 THEN
        PERFORM decrement_storage_usage(OLD.user_id, OLD.size_bytes);
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_storage_on_document_insert ON process_documents;
DROP TRIGGER IF EXISTS trigger_storage_on_document_delete ON process_documents;

-- Create triggers
CREATE TRIGGER trigger_storage_on_document_insert
    AFTER INSERT ON process_documents
    FOR EACH ROW
    EXECUTE FUNCTION handle_document_insert();

CREATE TRIGGER trigger_storage_on_document_delete
    AFTER DELETE ON process_documents
    FOR EACH ROW
    EXECUTE FUNCTION handle_document_delete();

-- 13. Function to get storage usage for user
CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id UUID)
RETURNS TABLE (
    used_bytes BIGINT,
    limit_bytes BIGINT,
    remaining_bytes BIGINT,
    documents_count INTEGER,
    is_unlimited BOOLEAN,
    period_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sq.storage_used_bytes,
        sq.storage_limit_bytes,
        CASE 
            WHEN sq.storage_limit_bytes = -1 THEN -1::BIGINT
            ELSE GREATEST(0, sq.storage_limit_bytes - sq.storage_used_bytes)
        END,
        sq.documents_count,
        sq.storage_limit_bytes = -1,
        sq.period_end
    FROM storage_quotas sq
    WHERE sq.user_id = p_user_id
      AND sq.period_start <= NOW()
      AND sq.period_end > NOW()
    ORDER BY sq.period_start DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Add helpful comments
COMMENT ON TABLE storage_quotas IS 'Tracks storage usage per user per billing period';
COMMENT ON FUNCTION check_storage_quota IS 'Validates if user has enough storage quota for upload';
COMMENT ON FUNCTION increment_storage_usage IS 'Increments storage usage after successful upload';
COMMENT ON FUNCTION decrement_storage_usage IS 'Decrements storage usage after file deletion';
COMMENT ON FUNCTION get_user_storage_usage IS 'Returns current storage usage for a user';

-- 15. Create view for admin monitoring
CREATE OR REPLACE VIEW storage_usage_summary AS
SELECT 
    sq.user_id,
    u.email as user_email,
    sq.storage_used_bytes,
    sq.storage_limit_bytes,
    sq.documents_count,
    sq.period_start,
    sq.period_end,
    CASE 
        WHEN sq.storage_limit_bytes = -1 THEN 0
        WHEN sq.storage_limit_bytes = 0 THEN 100
        ELSE (sq.storage_used_bytes::FLOAT / sq.storage_limit_bytes * 100)
    END as usage_percentage,
    sq.storage_limit_bytes = -1 as is_unlimited
FROM storage_quotas sq
JOIN auth.users u ON sq.user_id = u.id
WHERE sq.period_start <= NOW() AND sq.period_end > NOW();

-- Grant access to the view
GRANT SELECT ON storage_usage_summary TO authenticated;
