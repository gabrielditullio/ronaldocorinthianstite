
-- Add numeric metric columns to session_metrics
ALTER TABLE public.session_metrics
  ADD COLUMN IF NOT EXISTS month integer,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS form_completion_rate numeric,
  ADD COLUMN IF NOT EXISTS scheduling_rate numeric,
  ADD COLUMN IF NOT EXISTS attendance_rate numeric,
  ADD COLUMN IF NOT EXISTS noshow_confirmed numeric,
  ADD COLUMN IF NOT EXISTS noshow_unconfirmed numeric,
  ADD COLUMN IF NOT EXISTS reschedule_rate numeric,
  ADD COLUMN IF NOT EXISTS recorded_calls_rate numeric,
  ADD COLUMN IF NOT EXISTS confirmation_rate numeric,
  ADD COLUMN IF NOT EXISTS avg_ticket numeric;
