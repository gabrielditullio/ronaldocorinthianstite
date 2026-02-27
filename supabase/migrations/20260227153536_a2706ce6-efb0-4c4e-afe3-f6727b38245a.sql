
-- Create lead_stage_transitions table
CREATE TABLE public.lead_stage_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  transitioned_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_stage_transitions ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "lead_stage_transitions user access"
ON public.lead_stage_transitions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_lead_stage_transitions_lead_id ON public.lead_stage_transitions(lead_id);
CREATE INDEX idx_lead_stage_transitions_user_id ON public.lead_stage_transitions(user_id);
