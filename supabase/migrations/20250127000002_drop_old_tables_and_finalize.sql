-- Migration: Drop old tables and finalize optimization
-- Created: 2025-01-27
-- Description: Drop collections tables and consolidate message tables

-- ============================================
-- PHASE 1: Drop old collection tables
-- ============================================

-- Drop policies first
DROP POLICY IF EXISTS "Allow full access to own collection_files" ON collection_files;
DROP POLICY IF EXISTS "Allow view access to collection files for non-private collections" ON collection_files;
DROP POLICY IF EXISTS "Allow full access to own collection_workspaces" ON collection_workspaces;
DROP POLICY IF EXISTS "Allow full access to own collections" ON collections;
DROP POLICY IF EXISTS "Allow view access to non-private collections" ON collections;

-- Drop triggers
DROP TRIGGER IF EXISTS update_collection_files_updated_at ON collection_files;
DROP TRIGGER IF EXISTS update_collection_workspaces_updated_at ON collection_workspaces;
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;

-- Drop tables (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS collection_files CASCADE;
DROP TABLE IF EXISTS collection_workspaces CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

-- ============================================
-- PHASE 2: Ensure messages table has proper structure
-- ============================================

-- Check if messages table has all necessary indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- ============================================
-- PHASE 3: Add helpful constraints
-- ============================================

-- Ensure chats table has proper indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_workspace_id ON chats(workspace_id);

-- ============================================
-- PHASE 4: Optimize RLS for remaining tables
-- ============================================

-- Ensure RLS is enabled on critical tables
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 5: Update storage policies if needed
-- ============================================

-- Ensure storage buckets have proper policies
-- (Assuming they already exist and are configured)

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE processes IS 'Procesos legales - reemplazo de collections con campos adicionales';
COMMENT ON TABLE process_files IS 'Archivos asociados a procesos - con categorización y notas';
COMMENT ON TABLE chats IS 'Chats sin carpetas ni asistentes - sistema simplificado';
COMMENT ON TABLE files IS 'Archivos sin carpetas - organización por procesos';

