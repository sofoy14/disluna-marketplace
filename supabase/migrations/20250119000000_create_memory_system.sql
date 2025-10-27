-- Migración para sistema de memoria y capacidades agenticas
-- Crear tabla para mensajes con memoria
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para contexto de chat
CREATE TABLE IF NOT EXISTS chat_contexts (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  search_history JSONB DEFAULT '[]',
  user_preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_messages_chat_user ON messages(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_contexts_updated_at ON chat_contexts(updated_at);

-- Crear función para limpiar mensajes antiguos
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Crear función para limpiar contextos antiguos
CREATE OR REPLACE FUNCTION cleanup_old_contexts()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_contexts 
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;












