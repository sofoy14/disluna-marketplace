-- Migration: Cleanup unused tables and features
-- Created: 2025-01-27
-- Description: Remove assistants, tools, and folders system - not used in application

-- ============================================
-- PHASE 1: Remove DROP constraints first
-- ============================================

-- Drop RLS policies for tables we're about to delete
DROP POLICY IF EXISTS "Allow full access to own assistant_files" ON assistant_files;
DROP POLICY IF EXISTS "Allow full access to own assistant_collections" ON assistant_collections;
DROP POLICY IF EXISTS "Allow full access to own assistant_tools" ON assistant_tools;
DROP POLICY IF EXISTS "Allow full access to own assistant_workspaces" ON assistant_workspaces;
DROP POLICY IF EXISTS "Allow full access to own tools" ON tools;
DROP POLICY IF EXISTS "Allow view access to non-private tools" ON tools;
DROP POLICY IF EXISTS "Allow full access to own tool_workspaces" ON tool_workspaces;

-- Drop triggers
DROP TRIGGER IF EXISTS update_assistant_files_updated_at ON assistant_files;
DROP TRIGGER IF EXISTS update_assistant_collections_updated_at ON assistant_collections;
DROP TRIGGER IF EXISTS update_assistant_tools_updated_at ON assistant_tools;
DROP TRIGGER IF EXISTS update_tools_updated_at ON tools;
DROP TRIGGER IF EXISTS update_tool_workspaces_updated_at ON tool_workspaces;

-- ============================================
-- PHASE 2: Drop tables and related objects
-- ============================================

-- Drop assistant-related tables
DROP TABLE IF EXISTS assistant_files CASCADE;
DROP TABLE IF EXISTS assistant_collections CASCADE;
DROP TABLE IF EXISTS assistant_tools CASCADE;
DROP TABLE IF EXISTS assistant_workspaces CASCADE;
DROP TABLE IF EXISTS assistants CASCADE;

-- Drop tools-related tables
DROP TABLE IF EXISTS tool_workspaces CASCADE;
DROP TABLE IF EXISTS tools CASCADE;

-- Drop folders table
DROP TABLE IF EXISTS folders CASCADE;

-- ============================================
-- PHASE 3: Remove folder_id columns from other tables
-- ============================================

-- Remove folder_id from chats
ALTER TABLE chats DROP COLUMN IF EXISTS folder_id;
ALTER TABLE chats DROP COLUMN IF EXISTS assistant_id;

-- Remove folder_id from files
ALTER TABLE files DROP COLUMN IF EXISTS folder_id;

-- Remove folder_id from collections
ALTER TABLE collections DROP COLUMN IF EXISTS folder_id;

-- Remove folder_id from prompts
ALTER TABLE prompts DROP COLUMN IF EXISTS folder_id;

-- Remove folder_id from presets
ALTER TABLE presets DROP COLUMN IF EXISTS folder_id;

-- ============================================
-- PHASE 4: Add helpful indexes
-- ============================================

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);
CREATE INDEX IF NOT EXISTS idx_chats_workspace_created ON chats(workspace_id, created_at DESC);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE chats IS 'Tabla de conversaciones de chat - assistant_id y folder_id eliminados';
COMMENT ON TABLE files IS 'Tabla de archivos - folder_id eliminado';
COMMENT ON TABLE collections IS 'Tabla de colecciones (procesos) - folder_id eliminado';

