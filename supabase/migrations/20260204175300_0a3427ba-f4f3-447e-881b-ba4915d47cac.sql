-- Add custom_links field to clients table for flexible additional links
ALTER TABLE public.clients
ADD COLUMN custom_links JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the expected structure
COMMENT ON COLUMN public.clients.custom_links IS 'Array of {name: string, url: string} objects for custom links';