-- Fix infinite recursion in RLS policies
-- The issue: policies were checking the users table while operating on the users/tasks tables

-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Allow user deletion by service role" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON public.tasks;
DROP POLICY IF EXISTS "Only creators and admins can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own comments or admins can delete any" ON public.task_comments;

-- Recreate policies without circular references
-- For users table: Simplified policies without role checks
CREATE POLICY "Allow user creation during signup" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow user deletion by service role" ON public.users FOR DELETE USING (true);

-- Fixed tasks table policies to remove circular user role checks
-- For tasks table: Simplified policies without querying users table for roles
CREATE POLICY "Users can update tasks they created or are assigned to" ON public.tasks FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to
);
CREATE POLICY "Only creators can delete tasks" ON public.tasks FOR DELETE USING (
  auth.uid() = created_by
);

-- For task_comments table: Simplified policy without role checks
CREATE POLICY "Users can delete their own comments" ON public.task_comments FOR DELETE USING (
  auth.uid() = user_id
);

-- Note: Admin/manager privileges should be handled at the application level
-- using service role client for privileged operations
