-- Migration: Add indexing status fields to processes table
-- Created: 2025-02-03
-- Description: Add indexing_status, indexing_error, and last_indexed_at columns to processes table

-- Add indexing status columns
ALTER TABLE processes
ADD COLUMN IF NOT EXISTS indexing_status TEXT DEFAULT 'pending' 
  CHECK (indexing_status IN ('pending', 'processing', 'ready', 'error'));

ALTER TABLE processes
ADD COLUMN IF NOT EXISTS indexing_error TEXT;

ALTER TABLE processes
ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMPTZ;

-- Create index for indexing_status queries
CREATE INDEX IF NOT EXISTS idx_processes_indexing_status ON processes(indexing_status);

-- Add comment explaining the status logic
COMMENT ON COLUMN processes.indexing_status IS 
  'Estado de indexación: pending = sin documentos o sin procesar, processing = indexando, ready = todos indexados, error = error en indexación';

COMMENT ON COLUMN processes.last_indexed_at IS 
  'Última vez que se completó la indexación de todos los documentos del proceso';





