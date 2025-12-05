-- Make user_id nullable to support guest enquiries
ALTER TABLE public.enquiries 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a column to identify guest enquiries
ALTER TABLE public.enquiries 
ADD COLUMN is_guest BOOLEAN DEFAULT FALSE;

-- Update RLS policy to allow guest enquiries
DROP POLICY IF EXISTS "Authenticated users can create enquiries" ON public.enquiries;

CREATE POLICY "Anyone can create enquiries" 
ON public.enquiries 
FOR INSERT 
WITH CHECK (
  -- Either authenticated user with matching user_id
  (auth.uid() = user_id AND is_guest = FALSE)
  OR 
  -- Or guest user with null user_id
  (user_id IS NULL AND is_guest = TRUE)
);

-- Allow guests to view their own enquiries if they somehow need to
CREATE POLICY "Guests can view their enquiries by email" 
ON public.enquiries 
FOR SELECT 
USING (
  (auth.uid() = user_id) 
  OR 
  (is_guest = TRUE AND user_email = current_setting('request.jwt.claims', true)::json->>'email')
);