-- Drop the existing activity_logs table and recreate with correct schema
DROP TABLE IF EXISTS activity_logs;

-- Create the correct activity_logs table for bellman queue activities
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bellman_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  room_number TEXT,
  status TEXT NOT NULL, -- 'assigned', 'completed', 'cancelled', 'empty_room'
  guest_name TEXT,
  ticket_number TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_logs_bellman ON activity_logs(bellman_name);
CREATE INDEX idx_activity_logs_room ON activity_logs(room_number);
CREATE INDEX idx_activity_logs_status ON activity_logs(status);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on activity_logs" ON activity_logs
FOR ALL USING (true);
