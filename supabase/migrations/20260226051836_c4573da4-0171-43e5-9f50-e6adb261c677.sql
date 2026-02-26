
-- Create admin action logs table
CREATE TABLE public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins manage action logs"
ON public.admin_action_logs FOR ALL
TO authenticated
USING (public.is_admin_role(auth.uid()))
WITH CHECK (public.is_admin_role(auth.uid()));
