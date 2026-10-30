-- Drop existing restrictive policies for tasks UPDATE and DELETE
DROP POLICY IF EXISTS "Users can update own or assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and managers can delete tasks" ON public.tasks;

-- Create more permissive UPDATE policy - anyone can update tasks they created, are assigned to, or any task if they're admin/manager
-- Also allow any authenticated user to update task status
CREATE POLICY "Users can update tasks"
ON public.tasks
FOR UPDATE
USING (
  auth.uid() = created_by 
  OR auth.uid() = assigned_to 
  OR is_admin_or_manager(auth.uid())
  OR auth.uid() IS NOT NULL
);

-- Create DELETE policy - users can delete their own tasks, or admins/managers can delete any
CREATE POLICY "Users can delete own tasks or admins any"
ON public.tasks
FOR DELETE
USING (
  auth.uid() = created_by 
  OR is_admin_or_manager(auth.uid())
);