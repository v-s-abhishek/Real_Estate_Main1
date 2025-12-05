-- Add missing UPDATE policy for enquiries table
-- Admin and employees can update enquiry status
CREATE POLICY "Admin and employees can update enquiries"
ON public.enquiries
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role));