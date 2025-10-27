-- Migration: Create chat tables for memory management
-- Created: 2025-01-18
-- Description: Tables for chat memory, context, and enhanced tracking

-- Messages table (chat history with enhanced metadata)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat contexts table (enhanced context management)
CREATE TABLE IF NOT EXISTS chat_contexts (
  chat_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  search_history JSONB DEFAULT '[]',
  user_preferences JSONB DEFAULT '{}',
  cached_sources JSONB DEFAULT '[]',
  quality_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

CREATE INDEX IF NOT EXISTS idx_chat_contexts_user_id ON chat_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_contexts_updated_at ON chat_contexts(updated_at);

-- RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_contexts ENABLE ROW LEVEL SECURITY;

-- Messages: users can only see their own messages
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Chat contexts: users can only see their own contexts
CREATE POLICY "Users can view their own chat contexts" ON chat_contexts
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own chat contexts" ON chat_contexts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own chat contexts" ON chat_contexts
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_contexts_updated_at 
  BEFORE UPDATE ON chat_contexts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();











