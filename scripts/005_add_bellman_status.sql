-- Add bellman_status column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS bellman_status VARCHAR(20) DEFAULT 'off_duty' 
CHECK (bellman_status IN ('in_line', 'in_process', 'off_duty'));

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_bellman_status 
ON user_profiles(bellman_status) 
WHERE role = 'bellman';

-- Update existing bellman users to have default status
UPDATE user_profiles 
SET bellman_status = 'off_duty' 
WHERE role = 'bellman' AND bellman_status IS NULL;
