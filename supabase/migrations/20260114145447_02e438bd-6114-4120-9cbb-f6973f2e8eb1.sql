-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Filmmakers view own visits, managers view all" ON public.filmmaker_visits;

-- Create new policy that allows all authenticated users to view visits
CREATE POLICY "Authenticated users can view all visits"
ON public.filmmaker_visits
FOR SELECT
USING (auth.uid() IS NOT NULL);