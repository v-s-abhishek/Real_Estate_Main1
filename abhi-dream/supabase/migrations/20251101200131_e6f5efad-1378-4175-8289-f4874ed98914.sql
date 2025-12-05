-- Fix notifications table RLS policy vulnerability
-- Remove the vulnerable policy that allows any authenticated user to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a secure policy that only allows admin and employee roles to create notifications
-- This prevents regular users from creating fake notifications
CREATE POLICY "Admin and employees can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'employee')
  )
);

-- Note: Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so they will continue to work. This policy only affects direct client access.