-- =============================================================================
-- AUDIT: Check current RLS policies on tasks table
-- =============================================================================
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- =============================================================================
-- Check if REPLICA IDENTITY FULL is set on tasks
-- =============================================================================
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'tasks';
-- relreplident: 'd' = default, 'f' = full, 'n' = nothing, 'i' = index

-- =============================================================================
-- Check Supabase realtime publication includes tasks
-- =============================================================================
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- =============================================================================
-- Test: Verify a specific completed task exists with correct status
-- =============================================================================
SELECT id, title, status, updated_at, completed_at, hotel_id
FROM tasks 
ORDER BY updated_at DESC 
LIMIT 5;
