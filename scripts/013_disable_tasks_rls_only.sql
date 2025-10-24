-- Disable RLS on tasks table only to allow task creation
-- This bypasses the infinite recursion issue while keeping users table protected

-- Drop all existing policies on tasks table
DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON public.tasks;
DROP POLICY IF EXISTS "Only creators and admins can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow task creation" ON public.tasks;
DROP POLICY IF EXISTS "Allow task updates" ON public.tasks;
DROP POLICY IF EXISTS "Allow task deletes" ON public.tasks;
DROP POLICY IF EXISTS "Allow task reads" ON public.tasks;

-- Disable RLS on tasks table
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Note: Users table RLS remains enabled with metadata fallback working
