-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Admins and managers can delete demands" ON public.filmmaker_demands;

-- Create new delete policy that allows filmmakers to delete their own demands
CREATE POLICY "Filmmakers can delete own demands, admins can delete all"
ON public.filmmaker_demands
FOR DELETE
USING (
  (filmmaker_id = auth.uid()) OR is_admin_or_manager(auth.uid())
);