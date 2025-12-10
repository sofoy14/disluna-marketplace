-- Migration: Create process_documents table
-- Created: 2025-02-03
-- Description: Table to store documents uploaded to processes with indexing status

CREATE TABLE IF NOT EXISTS process_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File info
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  
  -- Indexing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'error')),
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ,
  
  -- Metadata JSONB for additional info
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_process_documents_process_id ON process_documents(process_id);
CREATE INDEX idx_process_documents_user_id ON process_documents(user_id);
CREATE INDEX idx_process_documents_status ON process_documents(status);

-- RLS
ALTER TABLE process_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own process_documents"
  ON process_documents
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_process_documents_updated_at
BEFORE UPDATE ON process_documents
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Comments
COMMENT ON TABLE process_documents IS 'Documentos subidos a procesos legales con estado de indexación';
COMMENT ON COLUMN process_documents.status IS 'Estado de indexación del documento: pending, processing, indexed, error';





