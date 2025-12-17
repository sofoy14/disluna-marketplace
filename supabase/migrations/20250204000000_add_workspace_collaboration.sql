--------------- WORKSPACE MEMBERS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS workspace_members (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELATIONSHIPS
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- ROLE
    role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'LAWYER', 'ASSISTANT', 'VIEWER')),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- UNIQUE CONSTRAINT
    UNIQUE(workspace_id, user_id)
);

-- INDEXES --

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role);

-- RLS --

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Members can view members of workspaces they belong to
CREATE POLICY "Members can view workspace members"
    ON workspace_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Only workspace owners and admins can insert/update/delete members
CREATE POLICY "Workspace owners and admins can manage members"
    ON workspace_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = workspace_members.workspace_id
            AND w.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = workspace_members.workspace_id
            AND w.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'ADMIN'
        )
    );

-- TRIGGERS --

CREATE TRIGGER update_workspace_members_updated_at
BEFORE UPDATE ON workspace_members
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Function to automatically add workspace owner as ADMIN member
CREATE OR REPLACE FUNCTION add_workspace_owner_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
    VALUES (NEW.id, NEW.user_id, 'ADMIN', NEW.user_id)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_owner_on_workspace_create
AFTER INSERT ON workspaces
FOR EACH ROW
EXECUTE FUNCTION add_workspace_owner_as_admin();

--------------- WORKSPACE INVITATIONS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS workspace_invitations (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELATIONSHIPS
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- INVITATION DATA
    email TEXT NOT NULL CHECK (char_length(email) <= 255),
    role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'LAWYER', 'ASSISTANT', 'VIEWER')),
    token_hash TEXT NOT NULL UNIQUE, -- Hash of the invitation token

    -- STATUS
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- INDEXES --

CREATE INDEX idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_token_hash ON workspace_invitations(token_hash);
CREATE INDEX idx_workspace_invitations_status ON workspace_invitations(status);
CREATE INDEX idx_workspace_invitations_expires_at ON workspace_invitations(expires_at);

-- RLS --

ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Workspace owners and admins can view all invitations
CREATE POLICY "Workspace owners and admins can view invitations"
    ON workspace_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = workspace_invitations.workspace_id
            AND w.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_invitations.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'ADMIN'
        )
    );

-- Users can view their own pending invitations by email
CREATE POLICY "Users can view own invitations"
    ON workspace_invitations
    FOR SELECT
    USING (
        status = 'PENDING'
        AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Only workspace owners and admins can manage invitations
CREATE POLICY "Workspace owners and admins can manage invitations"
    ON workspace_invitations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = workspace_invitations.workspace_id
            AND w.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_invitations.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = workspace_invitations.workspace_id
            AND w.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_invitations.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'ADMIN'
        )
    );

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE workspace_invitations
    SET status = 'EXPIRED'
    WHERE status = 'PENDING'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

--------------- WORKSPACE AUDIT LOGS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS workspace_audit_logs (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELATIONSHIPS
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

    -- ACTION DATA
    action_type TEXT NOT NULL CHECK (action_type IN (
        'workspace_updated',
        'member_added',
        'member_removed',
        'member_role_changed',
        'invitation_sent',
        'invitation_accepted',
        'invitation_revoked',
        'invitation_resent'
    )),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('workspace', 'member', 'invitation')),
    resource_id UUID,

    -- DETAILS
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES --

CREATE INDEX idx_workspace_audit_logs_workspace_id ON workspace_audit_logs(workspace_id);
CREATE INDEX idx_workspace_audit_logs_actor_id ON workspace_audit_logs(actor_id);
CREATE INDEX idx_workspace_audit_logs_action_type ON workspace_audit_logs(action_type);
CREATE INDEX idx_workspace_audit_logs_created_at ON workspace_audit_logs(created_at DESC);

-- RLS --

ALTER TABLE workspace_audit_logs ENABLE ROW LEVEL SECURITY;

-- Workspace members can view audit logs of their workspace
CREATE POLICY "Workspace members can view audit logs"
    ON workspace_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_audit_logs.workspace_id
            AND wm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = workspace_audit_logs.workspace_id
            AND w.user_id = auth.uid()
        )
    );

-- Only system can insert audit logs (via SECURITY DEFINER functions)
-- This will be handled in application layer

-- Function to log workspace actions
CREATE OR REPLACE FUNCTION log_workspace_action(
    p_workspace_id UUID,
    p_actor_id UUID,
    p_action_type TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO workspace_audit_logs (
        workspace_id,
        actor_id,
        action_type,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        p_workspace_id,
        p_actor_id,
        p_action_type,
        p_resource_type,
        p_resource_id,
        p_details,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

