-- Add ticket_number column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS ticket_number TEXT;

-- Create index for ticket_number for better search performance
CREATE INDEX IF NOT EXISTS idx_tasks_ticket_number ON public.tasks(ticket_number);
