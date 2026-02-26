
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  target text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active notifications
CREATE POLICY "Users read active notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage
CREATE POLICY "Admins manage notifications"
ON public.notifications FOR ALL
TO authenticated
USING (public.is_admin_role(auth.uid()))
WITH CHECK (public.is_admin_role(auth.uid()));

-- Notification reads table
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Users manage their own reads
CREATE POLICY "Users manage own reads"
ON public.notification_reads FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can read all (for counts)
CREATE POLICY "Admins read all notification reads"
ON public.notification_reads FOR SELECT
TO authenticated
USING (public.is_admin_role(auth.uid()));
