-- Migration: Refactor collections to processes with enhanced fields
-- Created: 2025-01-27
-- Description: Rename collections to processes and add legal-specific fields

-- ============================================
-- PHASE 1: Create new processes table with enhanced fields
-- ============================================

CREATE TABLE IF NOT EXISTS processes (
  -- ID
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- REQUIRED RELATIONSHIPS
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OPTIONAL RELATIONSHIPS (removed folder_id)
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

  -- METADATA
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ,

  -- SHARING
  sharing TEXT NOT NULL DEFAULT 'private',

  -- REQUIRED - Original fields
  description TEXT NOT NULL CHECK (char_length(description) <= 500),
  name TEXT NOT NULL CHECK (char_length(name) <= 100),

  -- NEW FIELDS FOR LEGAL PROCESSES
  process_number VARCHAR(100), -- Número de radicado/expediente
  process_type VARCHAR(50), -- Tipo: civil, penal, laboral, administrativo, constitucional, otro
  client_name VARCHAR(200), -- Nombre del cliente
  status VARCHAR(50) DEFAULT 'activo' CHECK (status IN ('activo', 'archivado', 'cerrado')), -- Estado del proceso
  start_date DATE, -- Fecha de inicio del proceso
  end_date DATE, -- Fecha de cierre del proceso
  metadata JSONB DEFAULT '{}' -- Información adicional flexible
);

-- ============================================
-- PHASE 2: Copy data from collections to processes
-- ============================================

-- Copy all data from collections to processes
INSERT INTO processes (id, user_id, created_at, updated_at, sharing, description, name, metadata)
SELECT id, user_id, created_at, updated_at, sharing, description, name, '{}'::jsonb
FROM collections;

-- ============================================
-- PHASE 3: Create process_workspaces table
-- ============================================

CREATE TABLE IF NOT EXISTS process_workspaces (
  -- REQUIRED RELATIONSHIPS
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  PRIMARY KEY(process_id, workspace_id),

  -- METADATA
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ
);

-- Copy data from collection_workspaces
INSERT INTO process_workspaces (user_id, process_id, workspace_id, created_at, updated_at)
SELECT user_id, collection_id, workspace_id, created_at, updated_at
FROM collection_workspaces;

-- ============================================
-- PHASE 4: Create process_files table
-- ============================================

CREATE TABLE IF NOT EXISTS process_files (
  -- REQUIRED RELATIONSHIPS
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,

  PRIMARY KEY(process_id, file_id),

  -- METADATA
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ,

  -- NEW FIELDS
  file_order INTEGER DEFAULT 0, -- Orden de los archivos en el proceso
  file_category VARCHAR(50), -- demanda, pruebas, sentencia, etc.
  notes TEXT -- Notas sobre el archivo en el contexto del proceso
);

-- Copy data from collection_files
INSERT INTO process_files (user_id, process_id, file_id, created_at, updated_at, file_order, file_category, notes)
SELECT user_id, collection_id, file_id, created_at, updated_at, 0, NULL, NULL
FROM collection_files;

-- ============================================
-- PHASE 5: Create indexes for processes
-- ============================================

-- Basic indexes
CREATE INDEX IF NOT EXISTS processes_user_id_idx ON processes(user_id);
CREATE INDEX IF NOT EXISTS process_workspaces_user_id_idx ON process_workspaces(user_id);
CREATE INDEX IF NOT EXISTS process_workspaces_process_id_idx ON process_workspaces(process_id);
CREATE INDEX IF NOT EXISTS process_workspaces_workspace_id_idx ON process_workspaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_process_files_process_id ON process_files(process_id);
CREATE INDEX IF NOT EXISTS idx_process_files_file_id ON process_files(file_id);
CREATE INDEX IF NOT EXISTS idx_process_files_process_user ON process_files(process_id, user_id);

-- Optimized indexes for legal process searches
CREATE INDEX IF NOT EXISTS idx_processes_status ON processes(status);
CREATE INDEX IF NOT EXISTS idx_processes_process_type ON processes(process_type);
CREATE INDEX IF NOT EXISTS idx_processes_start_date ON processes(start_date);
CREATE INDEX IF NOT EXISTS idx_processes_client_name ON processes(client_name);
CREATE INDEX IF NOT EXISTS idx_processes_workspace ON processes(user_id, workspace_id);

-- ============================================
-- PHASE 6: RLS Policies for processes
-- ============================================

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_files ENABLE ROW LEVEL SECURITY;

-- Processes policies
CREATE POLICY "Allow full access to own processes"
    ON processes
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private processes"
    ON processes
    FOR SELECT
    USING (sharing <> 'private');

-- Process workspaces policies
CREATE POLICY "Allow full access to own process_workspaces"
    ON process_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Process files policies
CREATE POLICY "Allow full access to own process_files"
    ON process_files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to process files for non-private processes"
    ON process_files
    FOR SELECT
    USING (process_id IN (
        SELECT id FROM processes WHERE sharing <> 'private'
    ));

-- ============================================
-- PHASE 7: Triggers
-- ============================================

CREATE TRIGGER update_processes_updated_at
BEFORE UPDATE ON processes
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_process_workspaces_updated_at
BEFORE UPDATE ON process_workspaces
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_process_files_updated_at
BEFORE UPDATE ON process_files
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- PHASE 8: Constraints
-- ============================================

-- Add check constraints for process status
ALTER TABLE processes 
ADD CONSTRAINT IF NOT EXISTS check_process_status 
CHECK (status IN ('activo', 'archivado', 'cerrado'));

-- Add check constraint for process type
ALTER TABLE processes 
ADD CONSTRAINT IF NOT EXISTS check_process_type 
CHECK (process_type IN ('civil', 'penal', 'laboral', 'administrativo', 'constitucional', 'otro') OR process_type IS NULL);

-- ============================================
-- PHASE 9: Comments
-- ============================================

COMMENT ON TABLE processes IS 'Procesos legales (casos, expedientes) de los usuarios';
COMMENT ON COLUMN processes.process_number IS 'Número de radicado o expediente';
COMMENT ON COLUMN processes.process_type IS 'Tipo de proceso legal';
COMMENT ON COLUMN processes.client_name IS 'Nombre del cliente asociado';
COMMENT ON COLUMN processes.status IS 'Estado del proceso: activo, archivado, cerrado';
COMMENT ON COLUMN processes.metadata IS 'Información adicional del proceso';

COMMENT ON TABLE process_files IS 'Archivos asociados a un proceso legal';
COMMENT ON COLUMN process_files.file_category IS 'Categoría del archivo: demanda, pruebas, sentencia, etc.';
COMMENT ON COLUMN process_files.file_order IS 'Orden de importancia/organización del archivo';

-- ============================================
-- NOTE: OLD TABLES WILL BE DROPPED IN NEXT MIGRATION
-- ============================================

