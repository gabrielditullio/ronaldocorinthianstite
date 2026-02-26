
-- Add role column to profiles (default 'user')
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Create a security definer function to check admin role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  )
$$;

-- Drop old restrictive SELECT policies on profiles to replace with inclusive ones
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

-- Recreate: users see own profile OR admins see all
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin_role(auth.uid()));

-- Allow admins to view all webhook_logs
CREATE POLICY "Admins view all webhook logs"
ON public.webhook_logs FOR SELECT
TO authenticated
USING (public.is_admin_role(auth.uid()));

-- Set existing admin users: update is_admin=true users to role='admin'
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true;
