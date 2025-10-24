-- Complete RLS Reset - Remove ALL policies and create simple ones
-- This fixes the infinite recursion error by removing all complex checks

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================

-- Drop all users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.users;

-- Drop all tasks table policies
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.tasks;

-- ============================================
-- STEP 2: Create SIMPLE policies without recursion
-- ============================================

-- Users table policies - NO checks against other tables
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  USING (true); -- Allow all authenticated users to read all user records

CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id); -- Users can only insert their own record

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  USING (auth.uid() = id); -- Users can only update their own record

-- Tasks table policies - NO checks against users table
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  USING (true); -- Allow all authenticated users to read all tasks

CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = created_by); -- Users can create tasks as themselves

CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  USING (true); -- Allow all authenticated users to update any task

CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  USING (true); -- Allow all authenticated users to delete any task

-- ============================================
-- STEP 3: Ensure RLS is enabled
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
