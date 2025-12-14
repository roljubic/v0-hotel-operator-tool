-- Insert sample users (these will be created after auth users are created)
-- This is just for reference - actual users will be created through the signup process

-- Sample tasks for demonstration
INSERT INTO public.tasks (title, description, priority, status, category, room_number, guest_name, due_date, estimated_duration, created_by) 
SELECT 
  'Clean Room 101',
  'Deep cleaning required after checkout',
  'high',
  'pending',
  'housekeeping',
  '101',
  'John Smith',
  NOW() + INTERVAL '2 hours',
  60,
  (SELECT id FROM public.users WHERE role = 'operator' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.users WHERE role = 'operator');

INSERT INTO public.tasks (title, description, priority, status, category, room_number, guest_name, due_date, estimated_duration, created_by)
SELECT 
  'Deliver luggage to Room 205',
  'Guest luggage arrived, needs immediate delivery',
  'urgent',
  'pending',
  'delivery',
  '205',
  'Jane Doe',
  NOW() + INTERVAL '30 minutes',
  15,
  (SELECT id FROM public.users WHERE role = 'operator' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.users WHERE role = 'operator');

INSERT INTO public.tasks (title, description, priority, status, category, estimated_duration, created_by)
SELECT 
  'Fix lobby air conditioning',
  'AC unit making strange noises',
  'medium',
  'pending',
  'maintenance',
  120,
  (SELECT id FROM public.users WHERE role = 'operator' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.users WHERE role = 'operator');
