-- Remove the foreign key constraint that's blocking property enquiries
ALTER TABLE public.enquiries DROP CONSTRAINT IF EXISTS enquiries_service_id_fkey;

-- The service_id will now store either a property_id or service_id based on service_type
-- No foreign key constraint needed since we have two separate tables (properties and services)