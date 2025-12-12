-- Cleanup legacy collection/workspace relationship tables
-- Safely drop unused tables now that the frontend relies on processes directly

BEGIN;

DROP TABLE IF EXISTS process_workspaces CASCADE;
DROP TABLE IF EXISTS collection_workspaces CASCADE;
DROP TABLE IF EXISTS collection_files CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

COMMIT;