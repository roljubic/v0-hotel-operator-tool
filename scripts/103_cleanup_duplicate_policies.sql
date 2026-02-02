-- Drop ALL existing policies on tasks table and recreate cleanly
DROP POLICY IF EXISTS "super_admins_view_all_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_view_hotel_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_create_hotel_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_delete_tasks" ON public.tasks;

-- Make sure RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies using direct subqueries
-- SELECT: Users can view tasks in their hotel
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  USING (
    hotel_id = (SELECT hotel_id FROM public.users WHERE id = auth.uid())
  );

-- INSERT: Users can create tasks in their hotel
CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  WITH CHECK (
    hotel_id = (SELECT hotel_id FROM public.users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- UPDATE: Users can update tasks in their hotel (with role check)
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  USING (
    hotel_id = (SELECT hotel_id FROM public.users WHERE id = auth.uid())
  );

-- DELETE: Admins/managers can delete tasks in their hotel
CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  USING (
    hotel_id = (SELECT hotel_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Verify the new policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks';
