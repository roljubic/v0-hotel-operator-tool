-- =============================================================================
-- TheBell Hotel Operations - Consolidated Secure Schema
-- =============================================================================
-- This migration consolidates all schema changes and implements proper RLS
-- with multi-tenancy support. Run this AFTER backing up your database.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: Create/Update Hotels Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  room_count INTEGER DEFAULT 0,
  invite_code TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add invite_code if it doesn't exist
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8);

-- =============================================================================
-- STEP 2: Create/Update Users Table with Proper Role Constraints
-- =============================================================================
-- Drop the old role constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add hotel_id if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE;

-- Add is_super_admin if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Add bellman_status if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bellman_status TEXT DEFAULT 'off_duty' 
  CHECK (bellman_status IN ('in_line', 'in_process', 'off_duty'));

-- Add new role constraint with all valid roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('bellman', 'bell_captain', 'phone_operator', 'manager', 'front_desk', 'admin', 'operator', 'bell_staff'));

-- =============================================================================
-- STEP 3: Update Tasks Table
-- =============================================================================
-- Add hotel_id if it doesn't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE;

-- Add ticket_number if it doesn't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ticket_number TEXT;

-- =============================================================================
-- STEP 4: Create/Update Activity Logs Table
-- =============================================================================
-- Add missing columns to activity_logs if they don't exist
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS bellman_name TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status constraint to include all valid values
DO $$ 
BEGIN
  ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- =============================================================================
-- STEP 5: Create Subscriptions Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 6: Create Task Comments Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 7: Create User Settings Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add hotel_id to user_settings if it doesn't exist
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE;

-- =============================================================================
-- STEP 7: Create Indexes for Performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_hotel_id ON public.users(hotel_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_bellman_status ON public.users(bellman_status) WHERE role = 'bellman';
CREATE INDEX IF NOT EXISTS idx_tasks_hotel_id ON public.tasks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_ticket_number ON public.tasks(ticket_number);
CREATE INDEX IF NOT EXISTS idx_activity_logs_hotel_id ON public.activity_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_bellman_name ON public.activity_logs(bellman_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON public.activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_type ON public.activity_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_hotel_id ON public.subscriptions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_hotel_id ON public.user_settings(hotel_id);

-- =============================================================================
-- STEP 8: Create Helper Function to Get User's Hotel ID
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS UUID AS $$
  SELECT hotel_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- STEP 9: Create Helper Function to Check if User is Super Admin
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.users WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- STEP 10: Create Helper Function to Check User Role
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- STEP 11: Drop All Existing RLS Policies
-- =============================================================================
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on users
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
  END LOOP;
  
  -- Drop all policies on tasks
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.tasks';
  END LOOP;
  
  -- Drop all policies on hotels
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'hotels' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.hotels';
  END LOOP;
  
  -- Drop all policies on activity_logs
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'activity_logs' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.activity_logs';
  END LOOP;
  
  -- Drop all policies on task_comments
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'task_comments' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.task_comments';
  END LOOP;
  
  -- Drop all policies on subscriptions
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'subscriptions' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.subscriptions';
  END LOOP;
  
  -- Drop all policies on user_settings
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_settings' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_settings';
  END LOOP;
END $$;

-- =============================================================================
-- STEP 12: Enable RLS on All Tables
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 13: RLS Policies for HOTELS Table
-- =============================================================================
-- Super admins can see all hotels
CREATE POLICY "super_admins_view_all_hotels" ON public.hotels
  FOR SELECT USING (public.is_super_admin());

-- Users can view their own hotel
CREATE POLICY "users_view_own_hotel" ON public.hotels
  FOR SELECT USING (id = public.get_user_hotel_id());

-- Anyone can view a hotel by invite code (for joining)
CREATE POLICY "anyone_view_hotel_by_invite" ON public.hotels
  FOR SELECT USING (true);

-- Only admins/managers of the hotel can update it
CREATE POLICY "admins_update_hotel" ON public.hotels
  FOR UPDATE USING (
    id = public.get_user_hotel_id() AND 
    public.get_user_role() IN ('admin', 'manager')
  );

-- Anyone authenticated can create a hotel (during onboarding)
CREATE POLICY "authenticated_create_hotel" ON public.hotels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- STEP 14: RLS Policies for USERS Table
-- =============================================================================
-- Super admins can see all users
CREATE POLICY "super_admins_view_all_users" ON public.users
  FOR SELECT USING (public.is_super_admin());

-- Users can view other users in their hotel
CREATE POLICY "users_view_hotel_users" ON public.users
  FOR SELECT USING (
    hotel_id = public.get_user_hotel_id() OR
    id = auth.uid()  -- Users can always see themselves
  );

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Admins/managers can update users in their hotel
CREATE POLICY "admins_update_hotel_users" ON public.users
  FOR UPDATE USING (
    hotel_id = public.get_user_hotel_id() AND 
    public.get_user_role() IN ('admin', 'manager')
  );

-- Allow inserting new users (handled by trigger from auth.users)
CREATE POLICY "insert_new_users" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Only admins can delete users
CREATE POLICY "admins_delete_users" ON public.users
  FOR DELETE USING (
    hotel_id = public.get_user_hotel_id() AND 
    public.get_user_role() IN ('admin', 'manager') AND
    id != auth.uid()  -- Can't delete yourself
  );

-- =============================================================================
-- STEP 15: RLS Policies for TASKS Table
-- =============================================================================
-- Super admins can see all tasks
CREATE POLICY "super_admins_view_all_tasks" ON public.tasks
  FOR SELECT USING (public.is_super_admin());

-- Users can view tasks in their hotel
CREATE POLICY "users_view_hotel_tasks" ON public.tasks
  FOR SELECT USING (hotel_id = public.get_user_hotel_id());

-- Users can create tasks in their hotel
CREATE POLICY "users_create_hotel_tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    hotel_id = public.get_user_hotel_id() AND
    created_by = auth.uid()
  );

-- Users can update tasks they created, are assigned to, or are admin/manager
CREATE POLICY "users_update_tasks" ON public.tasks
  FOR UPDATE USING (
    hotel_id = public.get_user_hotel_id() AND
    (
      created_by = auth.uid() OR
      assigned_to = auth.uid() OR
      public.get_user_role() IN ('admin', 'manager', 'operator', 'phone_operator', 'front_desk')
    )
  );

-- Only creators and admins can delete tasks
CREATE POLICY "users_delete_tasks" ON public.tasks
  FOR DELETE USING (
    hotel_id = public.get_user_hotel_id() AND
    (
      created_by = auth.uid() OR
      public.get_user_role() IN ('admin', 'manager')
    )
  );

-- =============================================================================
-- STEP 16: RLS Policies for ACTIVITY_LOGS Table
-- =============================================================================
-- Super admins can see all activity logs
CREATE POLICY "super_admins_view_all_logs" ON public.activity_logs
  FOR SELECT USING (public.is_super_admin());

-- Users can view activity logs in their hotel
CREATE POLICY "users_view_hotel_logs" ON public.activity_logs
  FOR SELECT USING (hotel_id = public.get_user_hotel_id());

-- Users can create activity logs in their hotel
CREATE POLICY "users_create_hotel_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (
    hotel_id = public.get_user_hotel_id()
  );

-- =============================================================================
-- STEP 17: RLS Policies for TASK_COMMENTS Table
-- =============================================================================
-- Users can view comments on tasks in their hotel
CREATE POLICY "users_view_hotel_comments" ON public.task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM public.tasks WHERE hotel_id = public.get_user_hotel_id()
    )
  );

-- Users can create comments
CREATE POLICY "users_create_comments" ON public.task_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    task_id IN (
      SELECT id FROM public.tasks WHERE hotel_id = public.get_user_hotel_id()
    )
  );

-- Users can update their own comments
CREATE POLICY "users_update_own_comments" ON public.task_comments
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own comments, admins can delete any
CREATE POLICY "users_delete_comments" ON public.task_comments
  FOR DELETE USING (
    user_id = auth.uid() OR
    public.get_user_role() IN ('admin', 'manager')
  );

-- =============================================================================
-- STEP 18: RLS Policies for SUBSCRIPTIONS Table
-- =============================================================================
-- Super admins can see all subscriptions
CREATE POLICY "super_admins_view_all_subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_super_admin());

-- Users can view their hotel's subscription
CREATE POLICY "users_view_hotel_subscription" ON public.subscriptions
  FOR SELECT USING (hotel_id = public.get_user_hotel_id());

-- Only admins can manage subscriptions
CREATE POLICY "admins_manage_subscriptions" ON public.subscriptions
  FOR ALL USING (
    hotel_id = public.get_user_hotel_id() AND
    public.get_user_role() IN ('admin', 'manager')
  );

-- =============================================================================
-- STEP 19: RLS Policies for USER_SETTINGS Table
-- =============================================================================
-- Users can view their own settings
CREATE POLICY "users_view_own_settings" ON public.user_settings
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own settings
CREATE POLICY "users_create_own_settings" ON public.user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own settings
CREATE POLICY "users_update_own_settings" ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own settings
CREATE POLICY "users_delete_own_settings" ON public.user_settings
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- STEP 20: Create Trigger to Auto-Create User Profile
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, phone, is_active, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'bellman'),  -- Default to lowest privilege
    NEW.raw_user_meta_data->>'phone',
    true,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- STEP 21: Create Updated_At Triggers
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_hotels_updated_at ON public.hotels;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 22: Enable Realtime for Tables (Skip if already exists)
-- =============================================================================
-- Note: The tables may already be part of supabase_realtime publication.
-- Run these manually if realtime is not working:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- =============================================================================
-- DONE
-- =============================================================================
