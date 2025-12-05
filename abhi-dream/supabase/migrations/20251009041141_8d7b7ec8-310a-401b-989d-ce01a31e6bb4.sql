-- Fix vulnerable guest enquiry access policy
-- Remove the vulnerable policy that relies on JWT email claims
DROP POLICY IF EXISTS "Guests can view their enquiries by email" ON public.enquiries;

-- Keep the secure policies:
-- 1. Authenticated users can view their own enquiries (already exists as "Users can view their own enquiries")
-- 2. Admin and employees can view all enquiries (already exists as "Admin and employees can view all enquiries")
-- 3. Anyone (including guests) can create enquiries (already exists as "Anyone can create enquiries")

-- The guest users can submit enquiries but cannot retrieve them later
-- This is secure because:
-- - Guests have no persistent session or authentication
-- - If they need to track enquiries, they should create an account
-- - Admin/employees can still see and respond to all enquiries including guest ones