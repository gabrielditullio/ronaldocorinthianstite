
CREATE TABLE public.goal_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  target_revenue numeric,
  avg_ticket numeric,
  conversion_rate numeric,
  show_rate numeric,
  scheduling_rate numeric,
  qualification_rate numeric,
  working_days integer DEFAULT 22,
  num_sellers integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.goal_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own simulations"
ON public.goal_simulations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
