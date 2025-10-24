-- Create activity_logs table for tracking all bellman activities
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bellman_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  room_number TEXT,
  status TEXT NOT NULL CHECK (status IN ('assigned', 'completed', 'cancelled', 'empty_room')),
  guest_name TEXT,
  ticket_number TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_bellman_name ON activity_logs(bellman_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_type ON activity_logs(task_type);

-- Add RLS policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read activity logs
CREATE POLICY "Allow authenticated users to read activity logs" ON activity_logs
  FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert activity logs
CREATE POLICY "Allow authenticated users to insert activity logs" ON activity_logs
  FOR INSERT TO authenticated WITH CHECK (true);
