-- Migration: Create process_document_sections table
-- Created: 2025-02-03
-- Description: Table to store document chunks with embeddings for RAG

CREATE TABLE IF NOT EXISTS process_document_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  tokens INT NOT NULL,
  
  -- Embedding (OpenAI text-embedding-3-small: 1536 dimensions)
  openai_embedding vector(1536),
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- page number, position, section type, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_process_document_sections_process_id ON process_document_sections(process_id);
CREATE INDEX idx_process_document_sections_document_id ON process_document_sections(document_id);
CREATE INDEX idx_process_document_sections_user_id ON process_document_sections(user_id);

-- Vector index for similarity search (HNSW for performance)
CREATE INDEX idx_process_document_sections_embedding ON process_document_sections
  USING hnsw (openai_embedding vector_cosine_ops);

-- RLS
ALTER TABLE process_document_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own process_document_sections"
  ON process_document_sections
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Comments
COMMENT ON TABLE process_document_sections IS 'Chunks de documentos de procesos con embeddings para búsqueda semántica';
COMMENT ON COLUMN process_document_sections.openai_embedding IS 'Embedding vector de OpenAI text-embedding-3-small (1536 dimensiones)';
COMMENT ON COLUMN process_document_sections.metadata IS 'Metadatos del chunk: número de página, posición, tipo de sección, etc.';


