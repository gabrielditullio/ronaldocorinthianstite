
-- Create session_metrics table (Phase 3 - Strategic Session)
CREATE TABLE public.session_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  action_items text,
  key_decisions text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.session_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own session_metrics"
ON public.session_metrics FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add total_billed column to monthly_snapshots
ALTER TABLE public.monthly_snapshots
ADD COLUMN IF NOT EXISTS total_billed numeric DEFAULT 0;
