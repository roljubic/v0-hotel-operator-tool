-- Enable REPLICA IDENTITY FULL on tables used with Supabase Realtime filters.
-- Without this, filtered realtime subscriptions (e.g. filter by hotel_id) may
-- silently drop UPDATE/DELETE events because the filter column value is not
-- available in the WAL change record.

ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;
