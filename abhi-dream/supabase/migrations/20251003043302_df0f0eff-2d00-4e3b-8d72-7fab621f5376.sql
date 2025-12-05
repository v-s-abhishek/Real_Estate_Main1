-- Add foreign key relationship between enquiries and services
ALTER TABLE public.enquiries 
ADD CONSTRAINT enquiries_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

-- Migrate existing properties to services table
INSERT INTO public.services (id, title, description, price, service_type, status, images, address, created_by, created_at, updated_at)
SELECT 
  id,
  title,
  description,
  price,
  'property'::text as service_type,
  status,
  images,
  address,
  created_by,
  created_at,
  updated_at
FROM public.properties;