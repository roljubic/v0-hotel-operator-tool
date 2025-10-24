-- Drop ALL existing policies on users and tasks tables
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;
DROP POLICY IF EXISTS "Allow users to update themselves" ON public.users;
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;

DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON public.tasks;
DROP POLICY IF EXISTS "Only creators and admins can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Recreate EXACT policies from working version
-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Only admins can insert users" ON public.users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Only admins can delete users" ON public.users FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- RLS Policies for tasks table
CREATE POLICY "Users can view all tasks" ON public.tasks FOR SELECT USING (true);

CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tasks they created or are assigned to" ON public.tasks FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator'))
);

CREATE POLICY "Only creators and admins can delete tasks" ON public.tasks FOR DELETE USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
