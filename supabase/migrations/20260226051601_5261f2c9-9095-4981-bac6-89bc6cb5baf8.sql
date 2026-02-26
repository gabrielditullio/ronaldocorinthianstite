
-- Enable RLS on webhook_logs (was missing)
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
