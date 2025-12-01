-- ============================================================================
-- MIGRACIÓN: Actualizar modelo por defecto a Tongyi Deep Research 30B
-- Fecha: 2025-05-28
-- Descripción: Corrige todos los modelos obsoletos a alibaba/tongyi-deepresearch-30b-a3b
-- ============================================================================

-- WORKSPACES: Actualizar modelo por defecto
UPDATE workspaces
SET default_model = 'alibaba/tongyi-deepresearch-30b-a3b'
WHERE default_model IN (
    'gpt-4-1106-preview',
    'gpt-4-turbo-preview',
    'gpt-4o',
    'gpt-4',
    'gpt-3.5-turbo',
    'tongyi/qwen2.5-32b-instruct'
);

-- PRESETS: Actualizar modelo
UPDATE presets
SET model = 'alibaba/tongyi-deepresearch-30b-a3b'
WHERE model IN (
    'gpt-4-1106-preview',
    'gpt-4-turbo-preview',
    'gpt-4o',
    'gpt-4',
    'gpt-3.5-turbo',
    'tongyi/qwen2.5-32b-instruct'
);

-- ASSISTANTS: Actualizar modelo
UPDATE assistants
SET model = 'alibaba/tongyi-deepresearch-30b-a3b'
WHERE model IN (
    'gpt-4-1106-preview',
    'gpt-4-turbo-preview',
    'gpt-4o',
    'gpt-4',
    'gpt-3.5-turbo',
    'tongyi/qwen2.5-32b-instruct'
);

-- CHATS: Actualizar modelo
UPDATE chats
SET model = 'alibaba/tongyi-deepresearch-30b-a3b'
WHERE model IN (
    'gpt-4-1106-preview',
    'gpt-4-turbo-preview',
    'gpt-4o',
    'gpt-4',
    'gpt-3.5-turbo',
    'tongyi/qwen2.5-32b-instruct'
);

-- Verificar cambios
DO $$
DECLARE
    workspace_count INT;
    preset_count INT;
    assistant_count INT;
    chat_count INT;
BEGIN
    SELECT COUNT(*) INTO workspace_count FROM workspaces WHERE default_model = 'alibaba/tongyi-deepresearch-30b-a3b';
    SELECT COUNT(*) INTO preset_count FROM presets WHERE model = 'alibaba/tongyi-deepresearch-30b-a3b';
    SELECT COUNT(*) INTO assistant_count FROM assistants WHERE model = 'alibaba/tongyi-deepresearch-30b-a3b';
    SELECT COUNT(*) INTO chat_count FROM chats WHERE model = 'alibaba/tongyi-deepresearch-30b-a3b';
    
    RAISE NOTICE '✅ Migración completada:';
    RAISE NOTICE '   - Workspaces actualizados: %', workspace_count;
    RAISE NOTICE '   - Presets actualizados: %', preset_count;
    RAISE NOTICE '   - Assistants actualizados: %', assistant_count;
    RAISE NOTICE '   - Chats actualizados: %', chat_count;
END $$;









