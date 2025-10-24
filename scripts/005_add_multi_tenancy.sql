-- Add multi-tenancy support with hotels table
-- This script updates the schema to match the production database

-- Create hotels table
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  room_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add hotel_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE;

-- Add hotel_id to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE;

-- Add hotel_id to activity_logs table
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE;

-- Enable RLS on hotels table
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hotels table
CREATE POLICY "Users can view their own hotel" ON public.hotels FOR SELECT USING (
  id IN (SELECT hotel_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can view all hotels" ON public.hotels FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
);

CREATE POLICY "Users can update their own hotel" ON public.hotels FOR UPDATE USING (
  id IN (SELECT hotel_id FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Anyone can create a hotel" ON public.hotels FOR INSERT WITH CHECK (true);

-- Update RLS policies for users table to filter by hotel_id
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view users in their hotel" ON public.users FOR SELECT USING (
  hotel_id IN (SELECT hotel_id FROM public.users WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
);

-- Update RLS policies for tasks table to filter by hotel_id
DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
CREATE POLICY "Users can view tasks in their hotel" ON public.tasks FOR SELECT USING (
  hotel_id IN (SELECT hotel_id FROM public.users WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
);

-- Update RLS policies for activity_logs table to filter by hotel_id
DROP POLICY IF EXISTS "Users can view all activity logs" ON public.activity_logs;
CREATE POLICY "Users can view activity logs in their hotel" ON public.activity_logs FOR SELECT USING (
  hotel_id IN (SELECT hotel_id FROM public.users WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
);

-- Add indexes for hotel_id columns
CREATE INDEX IF NOT EXISTS idx_users_hotel_id ON public.users(hotel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_hotel_id ON public.tasks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_hotel_id ON public.activity_logs(hotel_id);

-- Add updated_at trigger for hotels
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add is_super_admin column to users if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
