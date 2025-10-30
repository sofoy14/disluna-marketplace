-- Fix RLS policies for processes to allow INSERT
-- Created: 2025-02-01
-- Description: Fix RLS policies to allow inserting processes

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to own processes" ON processes;
DROP POLICY IF EXISTS "Allow view access to non-private processes" ON processes;

-- Create improved policies that allow all operations for own processes
CREATE POLICY "Allow full access to own processes"
    ON processes
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow viewing non-private processes
CREATE POLICY "Allow view access to non-private processes"
    ON processes
    FOR SELECT
    USING (sharing <> 'private');

-- Fix process_workspaces policies if needed
DROP POLICY IF EXISTS "Allow full access to own process_workspaces" ON process_workspaces;

CREATE POLICY "Allow full access to own process_workspaces"
    ON process_workspaces
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Log the changes
COMMENT ON POLICY "Allow full access to own processes" ON processes IS 
'Policy that allows users to perform all operations (SELECT, INSERT, UPDATE, DELETE) on their own processes';

COMMENT ON POLICY "Allow full access to own process_workspaces" ON process_workspaces IS 
'Policy that allows users to perform all operations on their own process-workspace relationships';

