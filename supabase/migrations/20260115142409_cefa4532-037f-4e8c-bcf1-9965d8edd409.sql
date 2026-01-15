-- Drop the old constraint and add a new one with 'a_fazer' status
ALTER TABLE public.filmmaker_demands 
DROP CONSTRAINT filmmaker_demands_status_check;

ALTER TABLE public.filmmaker_demands 
ADD CONSTRAINT filmmaker_demands_status_check 
CHECK (status = ANY (ARRAY['a_fazer'::text, 'em_processo'::text, 'terminado'::text, 'alteracoes'::text]));

-- Update default status to 'a_fazer' for new demands
ALTER TABLE public.filmmaker_demands 
ALTER COLUMN status SET DEFAULT 'a_fazer'::text;