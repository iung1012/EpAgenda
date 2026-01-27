-- Add delivery_link and assigned_to columns to filmmaker_demands table
ALTER TABLE public.filmmaker_demands
ADD COLUMN IF NOT EXISTS delivery_link text,
ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- Add comment for clarity
COMMENT ON COLUMN public.filmmaker_demands.delivery_link IS 'Link to the delivered content/task';
COMMENT ON COLUMN public.filmmaker_demands.assigned_to IS 'User ID of the collaborator assigned to this demand';