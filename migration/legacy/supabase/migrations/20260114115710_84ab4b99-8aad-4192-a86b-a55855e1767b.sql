-- Fix the UPDATE policy to be more restrictive
DROP POLICY IF EXISTS "Users can update read status" ON public.notifications;

-- Only allow authenticated users to update read_by for marking as read
CREATE POLICY "Authenticated users can mark as read"
ON public.notifications
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);