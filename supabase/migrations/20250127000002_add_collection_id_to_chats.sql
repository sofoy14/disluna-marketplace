-- Migration: Add collection_id to chats for process-specific chat management
-- Created: 2025-01-27
-- Description: Allows chats to be associated with collections/processes

-- Add collection_id column to chats table
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_collection_id ON chats(collection_id);

-- Update RLS policy to allow users to view chats in their collections
-- (The existing policy should cover this, but we're being explicit)

COMMENT ON COLUMN chats.collection_id IS 'References the collection/process this chat belongs to. NULL for general chats.';

