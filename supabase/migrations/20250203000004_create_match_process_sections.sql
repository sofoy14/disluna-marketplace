-- Migration: Create RPC function for similarity search in process document sections
-- Created: 2025-02-03
-- Description: Function to perform semantic search on process document sections using pgvector

-- Note: This function uses SECURITY DEFINER but explicitly checks user_id to ensure RLS is respected
-- The RLS policies on process_document_sections will still apply, but we add an explicit check
CREATE OR REPLACE FUNCTION match_process_document_sections(
  query_embedding vector(1536),
  process_id_param UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  process_id UUID,
  document_id UUID,
  content TEXT,
  tokens INT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has access to the process
  IF NOT EXISTS (
    SELECT 1 FROM processes p
    WHERE p.id = process_id_param
      AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to process';
  END IF;

  RETURN QUERY
  SELECT
    pds.id,
    pds.process_id,
    pds.document_id,
    pds.content,
    pds.tokens,
    1 - (pds.openai_embedding <=> query_embedding) AS similarity,
    pds.metadata
  FROM process_document_sections pds
  WHERE pds.process_id = process_id_param
    AND pds.openai_embedding IS NOT NULL
    -- Additional check: ensure user_id matches (RLS will also filter)
    AND pds.user_id = auth.uid()
  ORDER BY pds.openai_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_process_document_sections(vector(1536), UUID, INT) TO authenticated;

-- Comment
COMMENT ON FUNCTION match_process_document_sections IS 
  'Busca los chunks más similares a un query embedding dentro de un proceso específico. Respeta RLS policies.';

