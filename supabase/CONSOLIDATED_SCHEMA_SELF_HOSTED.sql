-- =====================================================
-- SCHEMA COMPLETO PARA SUPABASE SELF-HOSTED
-- Asistente Legal Inteligente
-- Fecha: 2025-02-08
-- =====================================================

-- =====================================================
-- 1. EXTENSIONES NECESARIAS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- 2. LIMPIAR FUNCIONES EXISTENTES CON CONFLICTOS DE TIPO
-- =====================================================
-- Estas funciones pueden existir con tipos de retorno diferentes
DROP FUNCTION IF EXISTS delete_storage_object_from_bucket(text, text);
DROP FUNCTION IF EXISTS match_file_items_local(vector(384), int, UUID[]);
DROP FUNCTION IF EXISTS match_file_items_openai(vector(1536), int, UUID[]);
DROP FUNCTION IF EXISTS match_process_sections(vector(1536), UUID, int);
DROP FUNCTION IF EXISTS public.non_private_workspace_exists(text);
DROP FUNCTION IF EXISTS create_profile_and_workspace();

-- =====================================================
-- 3. FUNCIONES UTILITARIAS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_storage_object_from_bucket(bucket_name text, object_path text)
RETURNS TABLE (status int, content text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Esta es una función placeholder - en self-hosted necesitarás
  -- implementar la lógica real o usar el cliente de storage de Supabase
  RETURN QUERY SELECT 200::int, 'OK'::text;
END;
$$;

-- =====================================================
-- 3. TABLA PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    bio TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 500),
    has_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT NOT NULL DEFAULT '' CHECK (char_length(image_url) <= 1000),
    image_path TEXT NOT NULL DEFAULT '' CHECK (char_length(image_path) <= 1000),
    profile_context TEXT NOT NULL DEFAULT '' CHECK (char_length(profile_context) <= 1500),
    display_name TEXT NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 100),
    use_azure_openai BOOLEAN NOT NULL DEFAULT FALSE,
    username TEXT NOT NULL UNIQUE CHECK (char_length(username) >= 3 AND char_length(username) <= 25),
    -- Campos opcionales API keys
    anthropic_api_key TEXT CHECK (char_length(anthropic_api_key) <= 1000),
    azure_openai_35_turbo_id TEXT CHECK (char_length(azure_openai_35_turbo_id) <= 1000),
    azure_openai_45_turbo_id TEXT CHECK (char_length(azure_openai_45_turbo_id) <= 1000),
    azure_openai_45_vision_id TEXT CHECK (char_length(azure_openai_45_vision_id) <= 1000),
    azure_openai_api_key TEXT CHECK (char_length(azure_openai_api_key) <= 1000),
    azure_openai_endpoint TEXT CHECK (char_length(azure_openai_endpoint) <= 1000),
    google_gemini_api_key TEXT CHECK (char_length(google_gemini_api_key) <= 1000),
    mistral_api_key TEXT CHECK (char_length(mistral_api_key) <= 1000),
    openai_api_key TEXT CHECK (char_length(openai_api_key) <= 1000),
    openai_organization_id TEXT CHECK (char_length(openai_organization_id) <= 1000),
    perplexity_api_key TEXT CHECK (char_length(perplexity_api_key) <= 1000),
    -- Campos adicionales API keys (from various migrations)
    azure_openai_embeddings_id TEXT CHECK (char_length(azure_openai_embeddings_id) <= 1000),
    openrouter_api_key TEXT CHECK (char_length(openrouter_api_key) <= 1000),
    groq_api_key TEXT CHECK (char_length(groq_api_key) <= 1000),
    -- NUEVO: onboarding_step
    onboarding_step INTEGER NOT NULL DEFAULT 0,
    -- NUEVO: Contact fields (from migration 20251218000000_add_profile_contact_fields.sql)
    first_name TEXT CHECK (char_length(first_name) <= 100),
    last_name TEXT CHECK (char_length(last_name) <= 100),
    phone_number TEXT CHECK (char_length(phone_number) <= 30),
    -- NUEVO: Theme preferences (from migration 20250202_add_theme_preferences.sql)
    theme_mode TEXT DEFAULT 'dark' CHECK (theme_mode IN ('dark', 'light')),
    custom_primary_color TEXT DEFAULT '#8b5cf6',
    selected_palette TEXT DEFAULT 'purple'
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own profiles" ON profiles
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 4. TABLA WORKSPACES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_home BOOLEAN NOT NULL DEFAULT false,
    default_context_length INTEGER NOT NULL DEFAULT 4096,
    default_model TEXT NOT NULL DEFAULT 'gpt-4-1106-preview',
    default_prompt TEXT NOT NULL DEFAULT 'You are a friendly, helpful AI assistant.',
    default_temperature REAL NOT NULL DEFAULT 0.5,
    embeddings_provider TEXT NOT NULL DEFAULT 'openai',
    include_profile_context BOOLEAN NOT NULL DEFAULT true,
    include_workspace_instructions BOOLEAN NOT NULL DEFAULT true,
    instructions TEXT NOT NULL DEFAULT '',
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    image_path TEXT DEFAULT '' NOT NULL CHECK (char_length(image_path) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own workspaces" ON workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 5. TABLA FOLDERS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'chats',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_workspace_id ON folders(workspace_id);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own folders" ON folders
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 6. TABLA FILES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    tokens INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own files" ON files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 7. TABLA FILE_WORKSPACES (relación muchos a muchos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.file_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_file_workspaces_file_id ON file_workspaces(file_id);
CREATE INDEX IF NOT EXISTS idx_file_workspaces_workspace_id ON file_workspaces(workspace_id);

ALTER TABLE file_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own file_workspaces" ON file_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 8. TABLA FILE_ITEMS (para embeddings/RAG)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.file_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    content TEXT NOT NULL,
    local_embedding vector(384),
    openai_embedding vector(1536),
    tokens INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_items_file_id ON file_items(file_id);
CREATE INDEX IF NOT EXISTS idx_file_items_embedding ON file_items 
    USING hnsw (openai_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_file_items_local_embedding ON file_items 
    USING hnsw (local_embedding vector_cosine_ops);

ALTER TABLE file_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own file items" ON file_items
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_file_items_updated_at ON file_items;
CREATE TRIGGER update_file_items_updated_at
    BEFORE UPDATE ON file_items
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Funciones de matching para file_items
CREATE OR REPLACE FUNCTION match_file_items_local(
    query_embedding vector(384),
    match_count int DEFAULT null,
    file_ids UUID[] DEFAULT null
) RETURNS TABLE (
    id UUID,
    file_id UUID,
    content TEXT,
    tokens INT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fi.id,
        fi.file_id,
        fi.content,
        fi.tokens,
        1 - (fi.local_embedding <=> query_embedding) as similarity
    FROM file_items fi
    WHERE (file_ids IS NULL OR fi.file_id = ANY(file_ids))
    ORDER BY fi.local_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_file_items_openai(
    query_embedding vector(1536),
    match_count int DEFAULT null,
    file_ids UUID[] DEFAULT null
) RETURNS TABLE (
    id UUID,
    file_id UUID,
    content TEXT,
    tokens INT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fi.id,
        fi.file_id,
        fi.content,
        fi.tokens,
        1 - (fi.openai_embedding <=> query_embedding) as similarity
    FROM file_items fi
    WHERE (file_ids IS NULL OR fi.file_id = ANY(file_ids))
    ORDER BY fi.openai_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================================================
-- 9. TABLA CHATS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'New Chat',
    model TEXT NOT NULL DEFAULT 'gpt-4-1106-preview',
    prompt TEXT,
    temperature REAL NOT NULL DEFAULT 0.5,
    context_length INTEGER NOT NULL DEFAULT 4096,
    include_profile_context BOOLEAN NOT NULL DEFAULT true,
    include_workspace_instructions BOOLEAN NOT NULL DEFAULT true,
    embeddings_provider TEXT NOT NULL DEFAULT 'openai',
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_workspace_id ON chats(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chats_folder_id ON chats(folder_id);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own chats" ON chats
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 10. TABLA CHAT_FILES (archivos adjuntos a chats)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_files_chat_id ON chat_files(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_file_id ON chat_files(file_id);

ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own chat_files" ON chat_files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 11. TABLA MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    model TEXT,
    sequence_number INTEGER NOT NULL,
    image_paths TEXT[] DEFAULT '{}',
    file_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own messages" ON messages
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 12. TABLA MESSAGE_FILE_ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.message_file_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_item_id UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, file_item_id)
);

CREATE INDEX IF NOT EXISTS idx_message_file_items_message_id ON message_file_items(message_id);
CREATE INDEX IF NOT EXISTS idx_message_file_items_file_item_id ON message_file_items(file_item_id);

ALTER TABLE message_file_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own message_file_items" ON message_file_items
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 13. TABLA PRESETS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    context_length INTEGER NOT NULL DEFAULT 4096,
    model TEXT NOT NULL DEFAULT 'gpt-4-1106-preview',
    prompt TEXT NOT NULL,
    temperature REAL NOT NULL DEFAULT 0.5,
    embeddings_provider TEXT NOT NULL DEFAULT 'openai',
    include_profile_context BOOLEAN NOT NULL DEFAULT true,
    include_workspace_instructions BOOLEAN NOT NULL DEFAULT true,
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);

ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own presets" ON presets
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_presets_updated_at ON presets;
CREATE TRIGGER update_presets_updated_at
    BEFORE UPDATE ON presets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 14. TABLA PRESET_WORKSPACES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.preset_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_id UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(preset_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_preset_workspaces_preset_id ON preset_workspaces(preset_id);
CREATE INDEX IF NOT EXISTS idx_preset_workspaces_workspace_id ON preset_workspaces(workspace_id);

ALTER TABLE preset_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own preset_workspaces" ON preset_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 15. TABLA PROMPTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own prompts" ON prompts
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at
    BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 16. TABLA PROMPT_WORKSPACES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prompt_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prompt_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_workspaces_prompt_id ON prompt_workspaces(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_workspaces_workspace_id ON prompt_workspaces(workspace_id);

ALTER TABLE prompt_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own prompt_workspaces" ON prompt_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 17. TABLA ASSISTANTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assistants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    model TEXT NOT NULL DEFAULT 'gpt-4-1106-preview',
    image_path TEXT DEFAULT '' NOT NULL,
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    context_length INTEGER NOT NULL DEFAULT 4096,
    include_profile_context BOOLEAN NOT NULL DEFAULT true,
    include_workspace_instructions BOOLEAN NOT NULL DEFAULT true,
    prompt TEXT NOT NULL DEFAULT '',
    temperature REAL NOT NULL DEFAULT 0.5,
    embeddings_provider TEXT NOT NULL DEFAULT 'openai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);

ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own assistants" ON assistants
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_assistants_updated_at ON assistants;
CREATE TRIGGER update_assistants_updated_at
    BEFORE UPDATE ON assistants
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 18. TABLA ASSISTANT_WORKSPACES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assistant_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assistant_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_assistant_workspaces_assistant_id ON assistant_workspaces(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_workspaces_workspace_id ON assistant_workspaces(workspace_id);

ALTER TABLE assistant_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own assistant_workspaces" ON assistant_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 19. TABLA ASSISTANT_FILES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assistant_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assistant_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_assistant_files_assistant_id ON assistant_files(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_files_file_id ON assistant_files(file_id);

ALTER TABLE assistant_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own assistant_files" ON assistant_files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 20. TABLA TOOLS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    schema JSONB NOT NULL DEFAULT '{}',
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tools_user_id ON tools(user_id);

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own tools" ON tools
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_tools_updated_at ON tools;
CREATE TRIGGER update_tools_updated_at
    BEFORE UPDATE ON tools
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 21. TABLA TOOL_WORKSPACES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tool_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tool_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_workspaces_tool_id ON tool_workspaces(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_workspaces_workspace_id ON tool_workspaces(workspace_id);

ALTER TABLE tool_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own tool_workspaces" ON tool_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 22. TABLA ASSISTANT_TOOLS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assistant_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assistant_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_assistant_tools_assistant_id ON assistant_tools(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_tools_tool_id ON assistant_tools(tool_id);

ALTER TABLE assistant_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own assistant_tools" ON assistant_tools
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 23. TABLA MODELS (Custom Models)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    model_id TEXT NOT NULL,
    context_length INTEGER NOT NULL DEFAULT 4096,
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);

ALTER TABLE models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own models" ON models
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_models_updated_at ON models;
CREATE TRIGGER update_models_updated_at
    BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 24. TABLA MODEL_WORKSPACES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.model_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_model_workspaces_model_id ON model_workspaces(model_id);
CREATE INDEX IF NOT EXISTS idx_model_workspaces_workspace_id ON model_workspaces(workspace_id);

ALTER TABLE model_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own model_workspaces" ON model_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 25. TABLA PROCESSES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    process_type TEXT NOT NULL DEFAULT 'judicial',
    case_number TEXT,
    court TEXT,
    plaintiff TEXT,
    defendant TEXT,
    start_date DATE,
    estimated_end_date DATE,
    actual_end_date DATE,
    metadata JSONB DEFAULT '{}',
    sharing TEXT NOT NULL DEFAULT 'private' CHECK (sharing IN ('private', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_processes_user_id ON processes(user_id);
CREATE INDEX IF NOT EXISTS idx_processes_status ON processes(status);

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own processes" ON processes
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_processes_updated_at ON processes;
CREATE TRIGGER update_processes_updated_at
    BEFORE UPDATE ON processes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 26. TABLA PROCESS_WORKSPACES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.process_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(process_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_process_workspaces_process_id ON process_workspaces(process_id);
CREATE INDEX IF NOT EXISTS idx_process_workspaces_workspace_id ON process_workspaces(workspace_id);

ALTER TABLE process_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own process_workspaces" ON process_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 27. TABLA PROCESS_FILES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.process_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(process_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_process_files_process_id ON process_files(process_id);
CREATE INDEX IF NOT EXISTS idx_process_files_file_id ON process_files(file_id);

ALTER TABLE process_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own process_files" ON process_files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 28. TABLA PROCESS_DOCUMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.process_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'error')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_process_documents_process_id ON process_documents(process_id);
CREATE INDEX IF NOT EXISTS idx_process_documents_status ON process_documents(status);

ALTER TABLE process_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own process_documents" ON process_documents
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_process_documents_updated_at ON process_documents;
CREATE TRIGGER update_process_documents_updated_at
    BEFORE UPDATE ON process_documents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 29. TABLA PROCESS_DOCUMENT_SECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.process_document_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_process_document_sections_document_id ON process_document_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_process_document_sections_embedding ON process_document_sections 
    USING hnsw (embedding vector_cosine_ops);

ALTER TABLE process_document_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own process_document_sections" ON process_document_sections
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Función para buscar secciones de documentos
CREATE OR REPLACE FUNCTION match_process_sections(
    query_embedding vector(1536),
    process_id_filter UUID,
    match_count int DEFAULT 5
) RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    tokens INTEGER,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pds.id,
        pds.document_id,
        pds.content,
        pds.tokens,
        1 - (pds.embedding <=> query_embedding) as similarity
    FROM process_document_sections pds
    WHERE pds.process_id = process_id_filter
    ORDER BY pds.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================================================
-- 30. TABLA TRANSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    transcript TEXT,
    speakers JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_process_id ON transcriptions(process_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own transcriptions" ON transcriptions
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;
CREATE TRIGGER update_transcriptions_updated_at
    BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 31. TABLA PROCESS_TRANSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.process_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(process_id, transcription_id)
);

CREATE INDEX IF NOT EXISTS idx_process_transcriptions_process_id ON process_transcriptions(process_id);
CREATE INDEX IF NOT EXISTS idx_process_transcriptions_transcription_id ON process_transcriptions(transcription_id);

ALTER TABLE process_transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to own process_transcriptions" ON process_transcriptions
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 32. TABLA WORKSPACE_MEMBERS (Colaboración)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_policy" ON workspace_members USING (true);

DROP TRIGGER IF EXISTS update_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER update_workspace_members_updated_at
    BEFORE UPDATE ON workspace_members
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 33. TABLA WORKSPACE_INVITATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);

ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_invitations_policy" ON workspace_invitations USING (true);

DROP TRIGGER IF EXISTS update_workspace_invitations_updated_at ON workspace_invitations;
CREATE TRIGGER update_workspace_invitations_updated_at
    BEFORE UPDATE ON workspace_invitations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- 34. TABLA WORKSPACE_AUDIT_LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workspace_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'invite', 'join', 'leave', 'export')),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('workspace', 'member', 'invitation', 'file', 'chat', 'process', 'document')),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_audit_logs_workspace_id ON workspace_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_logs_created_at ON workspace_audit_logs(created_at);

ALTER TABLE workspace_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_audit_logs_policy" ON workspace_audit_logs USING (true);

-- =====================================================
-- 35. TABLA USER_LOCATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    country VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_ip_address ON user_locations(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_locations_created_at ON user_locations(created_at);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_locations_policy" ON user_locations USING (true);

-- =====================================================
-- 36. TABLA USER_SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT,
    device_type TEXT,
    device_name TEXT,
    os TEXT,
    browser TEXT,
    ip_address TEXT,
    location_info JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_sessions_policy" ON user_sessions USING (true);

-- =====================================================
-- 37. TABLA USAGE_TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('chat_message', 'file_upload', 'process_created', 'transcription', 'api_call')),
    tokens_used INTEGER DEFAULT 0,
    credits_used DECIMAL(10, 4) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_workspace_id ON usage_tracking(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(created_at);

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_tracking_policy" ON usage_tracking USING (true);

-- =====================================================
-- 38. BILLING: TABLA PLANS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount_in_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    features TEXT[] DEFAULT '{}',
    query_limit INTEGER NOT NULL DEFAULT 100,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    plan_type VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
    max_output_tokens_monthly INTEGER NOT NULL DEFAULT -1,
    max_processes INTEGER NOT NULL DEFAULT 5,
    max_transcription_hours INTEGER NOT NULL DEFAULT 0,
    has_multiple_workspaces BOOLEAN NOT NULL DEFAULT false,
    has_processes BOOLEAN NOT NULL DEFAULT true,
    has_transcriptions BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_period ON plans(billing_period);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are viewable by everyone" ON plans FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at 
    BEFORE UPDATE ON plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar planes por defecto
INSERT INTO public.plans (
    name, description, amount_in_cents, currency, billing_period, 
    features, query_limit, sort_order, is_active, plan_type,
    max_output_tokens_monthly, max_processes, max_transcription_hours,
    has_multiple_workspaces, has_processes, has_transcriptions
) VALUES 
('Básico', 'Plan básico para empezar', 99000, 'COP', 'monthly', 
 ARRAY['100 consultas/mes', '5 procesos', 'Soporte básico'], 100, 1, true, 'basic',
 100000, 5, 0, false, true, false),
('Básico Anual', 'Plan básico con descuento anual', 990000, 'COP', 'yearly',
 ARRAY['100 consultas/mes', '5 procesos', 'Soporte básico', '2 meses gratis'], 100, 2, true, 'basic',
 100000, 5, 0, false, true, false),
('Profesional', 'Para profesionales del derecho', 299000, 'COP', 'monthly',
 ARRAY['500 consultas/mes', 'Procesos ilimitados', 'Soporte prioritario', 'Múltiples workspaces'], 500, 3, true, 'pro',
 500000, -1, 10, true, true, true),
('Profesional Anual', 'Plan profesional con descuento anual', 2990000, 'COP', 'yearly',
 ARRAY['500 consultas/mes', 'Procesos ilimitados', 'Soporte prioritario', 'Múltiples workspaces', '2 meses gratis'], 500, 4, true, 'pro',
 500000, -1, 10, true, true, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 39. BILLING: TABLA SPECIAL_OFFERS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.special_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percent INTEGER NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount_cents INTEGER,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    applies_to VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (applies_to IN ('new', 'existing', 'all')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_offers_code ON special_offers(code);
CREATE INDEX IF NOT EXISTS idx_special_offers_active ON special_offers(is_active);

ALTER TABLE special_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Special offers are viewable by everyone" ON special_offers FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_special_offers_updated_at ON special_offers;
CREATE TRIGGER update_special_offers_updated_at 
    BEFORE UPDATE ON special_offers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 40. BILLING: TABLA PAYMENT_SOURCES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    wompi_id VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'nequi', 'pse', 'CARD', 'NEQUI', 'PSE')),
    status VARCHAR(50) DEFAULT 'active',
    customer_email VARCHAR(255),
    last_four VARCHAR(4),
    brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    card_holder VARCHAR(255),
    expires_at TIMESTAMPTZ,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    wompi_token VARCHAR(255),
    wompi_source_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_sources_user_id ON payment_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sources_workspace_id ON payment_sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_sources_wompi_id ON payment_sources(wompi_id);

ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_sources_policy" ON payment_sources USING (true);

DROP TRIGGER IF EXISTS update_payment_sources_updated_at ON payment_sources;
CREATE TRIGGER update_payment_sources_updated_at 
    BEFORE UPDATE ON payment_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 41. BILLING: TABLA SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    payment_source_id UUID REFERENCES payment_sources(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'incomplete' CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'canceled', 'incomplete')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    billing_day INTEGER CHECK (billing_day >= 1 AND billing_day <= 31),
    trial_end TIMESTAMPTZ,
    wompi_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_wompi_reference ON subscriptions(wompi_reference);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_policy" ON subscriptions USING (true);

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 42. BILLING: TABLA INVOICES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    amount_in_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'void', 'refunded')),
    description TEXT,
    reference VARCHAR(255),
    wompi_transaction_id VARCHAR(255),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_reference ON invoices(reference);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_policy" ON invoices USING (true);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 43. BILLING: TABLA TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    wompi_id VARCHAR(255),
    amount_in_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'error', 'voided')),
    payment_method_type VARCHAR(50),
    reference VARCHAR(255),
    status_message TEXT,
    raw_payload JSONB DEFAULT '{}',
    wompi_transaction_id VARCHAR(255),
    wompi_reference VARCHAR(255),
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_id ON transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_wompi_id ON transactions(wompi_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_policy" ON transactions USING (true);

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 44. TABLA WOMPI_WEBHOOK_EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wompi_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    event_type TEXT,
    wompi_transaction_id TEXT,
    reference TEXT,
    payload JSONB DEFAULT '{}',
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wompi_webhook_events_idempotency ON wompi_webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_wompi_webhook_events_processed ON wompi_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_wompi_webhook_events_transaction ON wompi_webhook_events(wompi_transaction_id);

ALTER TABLE wompi_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wompi_webhook_events_policy" ON wompi_webhook_events USING (true);

-- =====================================================
-- 45. TABLA ADMIN_ACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_email VARCHAR(255) NOT NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'view', 'export', 'suspend', 'activate')),
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('user', 'chat', 'file', 'subscription', 'workspace', 'database')),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_actions_policy" ON admin_actions USING (true);

-- =====================================================
-- 46. TABLA SYSTEM_METRICS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(20, 4) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_metrics_policy" ON system_metrics USING (true);

-- =====================================================
-- 47. STORAGE BUCKETS (WASABI S3)
-- =====================================================
-- NOTA: Este sistema usa Wasabi S3 como proveedor de almacenamiento.
-- Las tablas storage.buckets y storage.objects NO se crean porque
-- todo el almacenamiento de archivos se maneja externamente en Wasabi.
-- 
-- Buckets configurados en Wasabi:
--   - ali (bucket principal para todos los archivos)
-- 
-- Configuración en .env:
--   STORAGE_PROVIDER=wasabi
--   WASABI_ENDPOINT=https://s3.wasabisys.com
--   WASABI_REGION=us-east-1
--   WASABI_BUCKET=ali
--
-- Las URLs de archivos se generan mediante presigned URLs de Wasabi.

-- =====================================================
-- 48. TRIGGER PARA CREAR PROFILE Y WORKSPACE AL REGISTRARSE
-- =====================================================
-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS create_profile_and_workspace_trigger ON auth.users;

CREATE OR REPLACE FUNCTION create_profile_and_workspace() 
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    random_username TEXT;
BEGIN
    random_username := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

    -- Create profile
    INSERT INTO public.profiles(
        user_id, anthropic_api_key, azure_openai_35_turbo_id, azure_openai_45_turbo_id, 
        azure_openai_45_vision_id, azure_openai_api_key, azure_openai_endpoint, 
        google_gemini_api_key, has_onboarded, image_url, image_path, mistral_api_key, 
        display_name, bio, openai_api_key, openai_organization_id, perplexity_api_key, 
        profile_context, use_azure_openai, username,
        azure_openai_embeddings_id, openrouter_api_key, groq_api_key,
        onboarding_step, first_name, last_name, phone_number,
        theme_mode, custom_primary_color, selected_palette
    ) VALUES(
        NEW.id, '', '', '', '', '', '', '', FALSE, '', '', '', '', '', '', '', '', '', FALSE, random_username,
        '', '', '', 0, '', '', '', 'dark', '#8b5cf6', 'purple'
    );

    -- Create home workspace
    INSERT INTO public.workspaces(
        user_id, is_home, name, default_context_length, default_model, 
        default_prompt, default_temperature, description, embeddings_provider, 
        include_profile_context, include_workspace_instructions, instructions
    ) VALUES(
        NEW.id, TRUE, 'Home', 4096, 'gpt-4-1106-preview',
        'You are a friendly, helpful AI assistant.', 0.5, 'My home workspace.',
        'openai', TRUE, TRUE, ''
    );

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Crear el trigger
CREATE TRIGGER create_profile_and_workspace_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.create_profile_and_workspace();

-- =====================================================
-- 49. FUNCIONES AUXILIARES PARA STORAGE
-- =====================================================

-- Función para validar acceso a imágenes de workspace
-- NOTA: Modificada para no depender de storage.filename (usamos Wasabi S3)
CREATE OR REPLACE FUNCTION public.non_private_workspace_exists(p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM workspaces
        WHERE (id::text = p_name) AND sharing <> 'private'
    );
$$;

-- =====================================================
-- 50. POLICIES PARA STORAGE
-- =====================================================
-- NOTA: No se crean policies para storage.objects porque
-- se usa Wasabi S3 como proveedor de almacenamiento externo.
-- El control de acceso a archivos se maneja mediante:
--   1. Presigned URLs de Wasabi (temporales y seguras)
--   2. RLS en tablas public.files, public.process_documents
--   3. Lógica de negocio en la aplicación

-- =====================================================
-- 51. WASABI S3 STORAGE SUPPORT
-- =====================================================

-- 51.1 Add storage columns to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_files_storage_key ON files(storage_key) 
WHERE storage_key IS NOT NULL;

-- 51.2 Add storage columns to process_documents table
ALTER TABLE process_documents 
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_process_docs_storage_key ON process_documents(storage_key) 
WHERE storage_key IS NOT NULL;

-- 51.3 Create storage_quotas table
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

CREATE INDEX IF NOT EXISTS idx_storage_quotas_user ON storage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_quotas_period ON storage_quotas(period_start, period_end);
-- NOTA: Índice parcial con NOW() removido porque NOW() no es IMMUTABLE
-- y no puede usarse en la cláusula WHERE de un índice.
-- El índice en (user_id, period_start, period_end) es suficiente para consultas eficientes.
CREATE INDEX IF NOT EXISTS idx_storage_quotas_active ON storage_quotas(user_id, period_start, period_end);

-- 51.4 Add max_storage_bytes to plans table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS max_storage_bytes BIGINT DEFAULT 0;

-- Update existing plans with storage limits
UPDATE plans SET max_storage_bytes = 0 WHERE plan_type = 'basic' AND max_storage_bytes = 0;
UPDATE plans SET max_storage_bytes = 1073741824 WHERE plan_type = 'pro' AND max_storage_bytes = 0;
UPDATE plans SET max_storage_bytes = -1 WHERE plan_type = 'enterprise' AND max_storage_bytes = 0;

COMMENT ON COLUMN plans.max_storage_bytes IS 'Storage limit in bytes. 0 = no storage, -1 = unlimited';

-- 51.5 Add storage columns to usage_tracking table
ALTER TABLE usage_tracking 
ADD COLUMN IF NOT EXISTS storage_bytes_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_bytes_limit BIGINT DEFAULT 0;

-- 51.6 Enable RLS on storage_quotas
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own storage quotas"
    ON storage_quotas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can manage storage quotas"
    ON storage_quotas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 51.7 Trigger for updated_at
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

-- 51.8 Function to check storage quota before upload
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

-- 51.9 Function to increment storage usage
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

-- 51.10 Function to decrement storage usage
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

-- 51.11 Trigger function for document insertion
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

-- 51.12 Trigger function for document deletion
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

-- 51.13 Function to get storage usage for user
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

-- 51.14 Comments
COMMENT ON TABLE storage_quotas IS 'Tracks storage usage per user per billing period for Wasabi S3';
COMMENT ON FUNCTION check_storage_quota IS 'Validates if user has enough storage quota for upload to Wasabi';
COMMENT ON FUNCTION increment_storage_usage IS 'Increments storage usage after successful upload to Wasabi';
COMMENT ON FUNCTION decrement_storage_usage IS 'Decrements storage usage after file deletion from Wasabi';
COMMENT ON FUNCTION get_user_storage_usage IS 'Returns current storage usage for a user in Wasabi';

-- 51.15 Create view for admin monitoring
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

GRANT SELECT ON storage_usage_summary TO authenticated;

-- =====================================================
-- ¡SETUP COMPLETO!
-- =====================================================
SELECT '✅ Schema completo creado exitosamente!' as status;
