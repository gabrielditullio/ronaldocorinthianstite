
-- Fix profiles RLS: change from RESTRICTIVE to PERMISSIVE
-- RESTRICTIVE policies require ALL to pass, which breaks when admin+user policies coexist

DROP POLICY IF EXISTS "profiles user select" ON profiles;
DROP POLICY IF EXISTS "profiles admin select" ON profiles;
DROP POLICY IF EXISTS "profiles user update" ON profiles;
DROP POLICY IF EXISTS "profiles admin update" ON profiles;

-- Permissive SELECT: user can read own profile
CREATE POLICY "profiles user select"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- Permissive SELECT: admins can read all profiles
CREATE POLICY "profiles admin select"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
));

-- Permissive UPDATE: user can update own profile
CREATE POLICY "profiles user update"
ON profiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- Permissive UPDATE: admins can update all profiles
CREATE POLICY "profiles admin update"
ON profiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
));
