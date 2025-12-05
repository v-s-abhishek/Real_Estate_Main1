-- Create admin user
-- Password: Admin@123
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@eliteproperties.com',
  crypt('Admin@123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User","phone":"9999999999"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create employee user
-- Password: Employee@123
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'employee@eliteproperties.com',
  crypt('Employee@123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Employee User","phone":"8888888888"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Update roles for admin user
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@eliteproperties.com');

-- Update roles for employee user
UPDATE public.user_roles 
SET role = 'employee'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'employee@eliteproperties.com');