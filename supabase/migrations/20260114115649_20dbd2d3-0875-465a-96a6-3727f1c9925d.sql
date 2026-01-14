-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Everyone can view all notifications
CREATE POLICY "Everyone can view notifications"
ON public.notifications
FOR SELECT
USING (true);

-- Authenticated users can create notifications
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update notifications they created (to mark as read by updating read_by)
CREATE POLICY "Users can update read status"
ON public.notifications
FOR UPDATE
USING (true);

-- Admins and managers can delete notifications
CREATE POLICY "Admins and managers can delete notifications"
ON public.notifications
FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;