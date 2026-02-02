-- =============================================================================
-- FIX TASKS RLS POLICY
-- This script fixes the tasks RLS policy to allow authenticated users
-- with a hotel_id to create tasks
-- =============================================================================

-- First, let's check what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tasks';

-- Drop the existing insert policy
DROP POLICY IF EXISTS "users_create_hotel_tasks" ON public.tasks;

-- Create a more permissive insert policy that properly checks hotel_id
-- Using a simpler approach that doesn't rely on the helper function for INSERT
CREATE POLICY "users_create_hotel_tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    -- The user must be authenticated
    auth.uid() IS NOT NULL AND
    -- The created_by must be the current user
    created_by = auth.uid() AND
    -- The hotel_id must match what's in the users table (using subquery)
    hotel_id IN (
      SELECT u.hotel_id 
      FROM public.users u 
      WHERE u.id = auth.uid() AND u.hotel_id IS NOT NULL
    )
  );

-- Also update SELECT policy to be more permissive for authenticated users
DROP POLICY IF EXISTS "users_view_hotel_tasks" ON public.tasks;

CREATE POLICY "users_view_hotel_tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    hotel_id IN (
      SELECT u.hotel_id 
      FROM public.users u 
      WHERE u.id = auth.uid() AND u.hotel_id IS NOT NULL
    )
  );

-- Update policy
DROP POLICY IF EXISTS "users_update_tasks" ON public.tasks;

CREATE POLICY "users_update_tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    hotel_id IN (
      SELECT u.hotel_id 
      FROM public.users u 
      WHERE u.id = auth.uid() AND u.hotel_id IS NOT NULL
    ) AND
    (
      created_by = auth.uid() OR
      assigned_to = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'manager', 'operator', 'phone_operator', 'front_desk')
      )
    )
  );

-- Delete policy
DROP POLICY IF EXISTS "users_delete_tasks" ON public.tasks;

CREATE POLICY "users_delete_tasks" ON public.tasks
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    hotel_id IN (
      SELECT u.hotel_id 
      FROM public.users u 
      WHERE u.id = auth.uid() AND u.hotel_id IS NOT NULL
    ) AND
    (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'manager')
      )
    )
  );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'tasks';

-- Test: Check current user's hotel_id
SELECT 
  id, 
  email, 
  hotel_id, 
  role,
  (SELECT hotel_id FROM public.users WHERE id = auth.uid()) as hotel_id_via_subquery,
  public.get_user_hotel_id() as hotel_id_via_function
FROM public.users 
WHERE id = auth.uid();
