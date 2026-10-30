-- Corrigir política de SELECT na tabela profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Corrigir política de SELECT na tabela clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Authenticated users can view clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (true);