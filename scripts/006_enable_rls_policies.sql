-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own hotel's users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Managers can manage their hotel's users" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;

DROP POLICY IF EXISTS "Users can view their hotel's tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks for their hotel" ON tasks;
DROP POLICY IF EXISTS "Users can update their hotel's tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their hotel's tasks" ON tasks;
DROP POLICY IF EXISTS "Super admins can view all tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view their hotel's activity logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Super admins can view all activity logs" ON activity_logs;

DROP POLICY IF EXISTS "Users can view their own hotel" ON hotels;
DROP POLICY IF EXISTS "Managers can update their hotel" ON hotels;
DROP POLICY IF EXISTS "Super admins can view all hotels" ON hotels;
DROP POLICY IF EXISTS "Super admins can manage all hotels" ON hotels;

DROP POLICY IF EXISTS "Users can view their hotel's subscription" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON subscriptions;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's hotel_id
CREATE OR REPLACE FUNCTION get_user_hotel_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT hotel_id FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS TABLE POLICIES
CREATE POLICY "Users can view their own hotel's users"
  ON users FOR SELECT
  USING (
    hotel_id = get_user_hotel_id()
    OR is_super_admin()
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Managers can manage their hotel's users"
  ON users FOR ALL
  USING (
    hotel_id = get_user_hotel_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('manager', 'super_admin')
    )
  );

-- TASKS TABLE POLICIES
CREATE POLICY "Users can view their hotel's tasks"
  ON tasks FOR SELECT
  USING (
    hotel_id = get_user_hotel_id()
    OR is_super_admin()
  );

CREATE POLICY "Users can create tasks for their hotel"
  ON tasks FOR INSERT
  WITH CHECK (hotel_id = get_user_hotel_id());

CREATE POLICY "Users can update their hotel's tasks"
  ON tasks FOR UPDATE
  USING (hotel_id = get_user_hotel_id())
  WITH CHECK (hotel_id = get_user_hotel_id());

CREATE POLICY "Users can delete their hotel's tasks"
  ON tasks FOR DELETE
  USING (
    hotel_id = get_user_hotel_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('manager', 'front_desk', 'super_admin')
    )
  );

-- ACTIVITY LOGS TABLE POLICIES
CREATE POLICY "Users can view their hotel's activity logs"
  ON activity_logs FOR SELECT
  USING (
    hotel_id = get_user_hotel_id()
    OR is_super_admin()
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (hotel_id = get_user_hotel_id());

-- HOTELS TABLE POLICIES
CREATE POLICY "Users can view their own hotel"
  ON hotels FOR SELECT
  USING (
    id = get_user_hotel_id()
    OR is_super_admin()
  );

CREATE POLICY "Managers can update their hotel"
  ON hotels FOR UPDATE
  USING (
    id = get_user_hotel_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('manager', 'super_admin')
    )
  );

CREATE POLICY "Super admins can manage all hotels"
  ON hotels FOR ALL
  USING (is_super_admin());

-- SUBSCRIPTIONS TABLE POLICIES
CREATE POLICY "Users can view their hotel's subscription"
  ON subscriptions FOR SELECT
  USING (
    hotel_id = get_user_hotel_id()
    OR is_super_admin()
  );

CREATE POLICY "Super admins can manage all subscriptions"
  ON subscriptions FOR ALL
  USING (is_super_admin());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
