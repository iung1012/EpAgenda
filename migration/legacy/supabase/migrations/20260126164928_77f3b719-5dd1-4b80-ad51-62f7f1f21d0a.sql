-- Add UPDATE policy for clients to allow users who created the client or admins/managers to update
-- First check if there's already an UPDATE-specific policy
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;

-- Create UPDATE policy - users can update clients they created, or admins/managers can update any
CREATE POLICY "Users can update own clients"
ON public.clients
FOR UPDATE
USING (
  auth.uid() = created_by 
  OR is_admin_or_manager(auth.uid())
);