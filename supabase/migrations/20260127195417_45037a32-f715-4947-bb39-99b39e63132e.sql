-- Enable realtime for tasks table to listen for assignment changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;