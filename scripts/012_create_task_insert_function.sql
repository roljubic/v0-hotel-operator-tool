-- Create a function to insert tasks that bypasses RLS
-- This function runs with SECURITY DEFINER which means it runs with the privileges of the function owner

-- First, drop the function if it exists
DROP FUNCTION IF EXISTS public.create_task_bypass_rls;

-- Create the function
CREATE OR REPLACE FUNCTION public.create_task_bypass_rls(
  p_title TEXT,
  p_description TEXT,
  p_priority TEXT,
  p_guest_name TEXT DEFAULT NULL,
  p_room_number TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  priority TEXT,
  status TEXT,
  guest_name TEXT,
  room_number TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by UUID;
  v_new_task_id UUID;
BEGIN
  -- Use provided created_by or fall back to auth.uid()
  v_created_by := COALESCE(p_created_by, auth.uid());
  
  -- Insert the task
  INSERT INTO public.tasks (
    title,
    description,
    priority,
    status,
    guest_name,
    room_number,
    created_by
  )
  VALUES (
    p_title,
    p_description,
    p_priority,
    'pending',
    p_guest_name,
    p_room_number,
    v_created_by
  )
  RETURNING tasks.id INTO v_new_task_id;
  
  -- Return the created task
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.guest_name,
    t.room_number,
    t.created_by,
    t.created_at
  FROM public.tasks t
  WHERE t.id = v_new_task_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_task_bypass_rls TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_task_bypass_rls IS 'Creates a task bypassing RLS policies to avoid infinite recursion issues';
