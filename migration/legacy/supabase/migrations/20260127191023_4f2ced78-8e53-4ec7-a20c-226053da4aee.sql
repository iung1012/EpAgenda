-- Add delivery_link column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN delivery_link text;