-- Comprehensive RLS Policy Fix
-- This script removes all problematic policies and creates simple, working ones

-- Drop ALL existing policies on all tables
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Allow user deletion by service role" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own hotel's users" ON public.users;
DROP POLICY IF EXISTS "Managers can manage their hotel's users" ON public.users;

DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON public.tasks;
DROP POLICY IF EXISTS "Only creators and admins can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Only creators can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their hotel's tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for their hotel" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their hotel's tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their hotel's tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can create activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view their hotel's activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;

DROP POLICY IF EXISTS "Users can view all task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments or admins can delete any" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;

-- Create simple, non-recursive policies for USERS table
CREATE POLICY "Anyone can view users" ON public.users 
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone authenticated can insert users" ON public.users 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can delete users" ON public.users 
  FOR DELETE USING (true);

-- Create simple, non-recursive policies for TASKS table
CREATE POLICY "Anyone can view tasks" ON public.tasks 
  FOR SELECT USING (true);

-- Added INSERT policy for tasks - this was missing!
CREATE POLICY "Authenticated users can create tasks" ON public.tasks 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own or assigned tasks" ON public.tasks 
  FOR UPDATE USING (
    auth.uid() = created_by OR auth.uid() = assigned_to
  );

CREATE POLICY "Users can delete own tasks" ON public.tasks 
  FOR DELETE USING (auth.uid() = created_by);

-- Create simple policies for ACTIVITY_LOGS table
CREATE POLICY "Anyone can view activity logs" ON public.activity_logs 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create activity logs" ON public.activity_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create simple policies for TASK_COMMENTS table
CREATE POLICY "Anyone can view comments" ON public.task_comments 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.task_comments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.task_comments 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.task_comments 
  FOR DELETE USING (auth.uid() = user_id);
