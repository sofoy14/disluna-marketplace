-- Migration: Create user_sessions table for device limit tracking
-- Users can only be logged in on max 2 devices simultaneously

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device_fingerprint TEXT,
    device_name TEXT,
    device_type TEXT, -- 'mobile', 'desktop', 'tablet'
    browser TEXT,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity_at);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions"
    ON user_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
    ON user_sessions FOR DELETE
    USING (user_id = auth.uid());

-- Service role policy for system operations
CREATE POLICY "Service role can manage all sessions"
    ON user_sessions
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mark sessions as inactive if expired or inactive for more than 24 hours
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE is_active = TRUE 
    AND (
        expires_at < NOW() 
        OR last_activity_at < NOW() - INTERVAL '24 hours'
    );
    
    -- Delete sessions older than 30 days
    DELETE FROM user_sessions 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Function to check device limit (max 2 active sessions per user)
CREATE OR REPLACE FUNCTION check_device_limit(p_user_id UUID)
RETURNS TABLE(
    can_create_session BOOLEAN,
    active_sessions_count INTEGER,
    oldest_session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_count INTEGER;
    oldest_id UUID;
BEGIN
    -- Count active sessions
    SELECT COUNT(*) INTO session_count
    FROM user_sessions
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Get oldest session if over limit
    IF session_count >= 2 THEN
        SELECT id INTO oldest_id
        FROM user_sessions
        WHERE user_id = p_user_id AND is_active = TRUE
        ORDER BY last_activity_at ASC
        LIMIT 1;
    END IF;
    
    RETURN QUERY SELECT 
        session_count < 2 AS can_create_session,
        session_count AS active_sessions_count,
        oldest_id AS oldest_session_id;
END;
$$;

-- Function to create a new session (enforcing limit)
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_device_fingerprint TEXT DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL,
    p_browser TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_force_create BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    session_id UUID,
    created BOOLEAN,
    removed_session_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_count INTEGER;
    v_oldest_session_id UUID;
    v_new_session_id UUID;
    v_removed_id UUID := NULL;
BEGIN
    -- Clean up expired sessions first
    PERFORM cleanup_expired_sessions();
    
    -- Count active sessions
    SELECT COUNT(*), MIN(id) INTO v_session_count, v_oldest_session_id
    FROM user_sessions
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Check if we need to remove an old session
    IF v_session_count >= 2 THEN
        IF p_force_create THEN
            -- Deactivate the oldest session
            UPDATE user_sessions 
            SET is_active = FALSE 
            WHERE id = (
                SELECT id FROM user_sessions 
                WHERE user_id = p_user_id AND is_active = TRUE 
                ORDER BY last_activity_at ASC 
                LIMIT 1
            )
            RETURNING id INTO v_removed_id;
        ELSE
            -- Return error - device limit reached
            RETURN QUERY SELECT 
                NULL::UUID AS session_id,
                FALSE AS created,
                NULL::UUID AS removed_session_id,
                'Has alcanzado el límite de 2 dispositivos. Por favor cierra sesión en otro dispositivo.'::TEXT AS error_message;
            RETURN;
        END IF;
    END IF;
    
    -- Create new session
    INSERT INTO user_sessions (
        user_id, 
        session_token, 
        device_fingerprint, 
        device_name,
        device_type,
        browser,
        ip_address, 
        user_agent,
        expires_at
    ) VALUES (
        p_user_id,
        p_session_token,
        p_device_fingerprint,
        p_device_name,
        p_device_type,
        p_browser,
        p_ip_address,
        p_user_agent,
        NOW() + INTERVAL '7 days'
    )
    RETURNING id INTO v_new_session_id;
    
    RETURN QUERY SELECT 
        v_new_session_id AS session_id,
        TRUE AS created,
        v_removed_id AS removed_session_id,
        NULL::TEXT AS error_message;
END;
$$;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated BOOLEAN := FALSE;
BEGIN
    UPDATE user_sessions 
    SET last_activity_at = NOW()
    WHERE session_token = p_session_token AND is_active = TRUE;
    
    IF FOUND THEN
        v_updated := TRUE;
    END IF;
    
    RETURN v_updated;
END;
$$;

-- Function to deactivate a session
CREATE OR REPLACE FUNCTION deactivate_session(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE session_token = p_session_token;
    
    RETURN FOUND;
END;
$$;

-- Add max_devices column to plans table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'max_devices') THEN
            ALTER TABLE plans ADD COLUMN max_devices INTEGER DEFAULT 2;
        END IF;
    END IF;
END $$;

-- Comment on table
COMMENT ON TABLE user_sessions IS 'Tracks user sessions for device limit enforcement (max 2 devices per user)';

