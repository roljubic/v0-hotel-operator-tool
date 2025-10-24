-- Enable real-time for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Enable real-time for activity_logs table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- Enable real-time for task_comments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;

-- Enable real-time for users table (for profile updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
