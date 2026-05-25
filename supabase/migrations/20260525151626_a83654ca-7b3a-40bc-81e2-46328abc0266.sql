-- Ensure the user is an admin
UPDATE public.profiles 
SET is_admin = true, role = 'admin' 
WHERE email = 'biancacleto.comercial@gmail.com';

-- Also ensure the owner email is admin if it exists
UPDATE public.profiles 
SET is_admin = true, role = 'admin' 
WHERE email = 'biancapcleto@gmail.com';