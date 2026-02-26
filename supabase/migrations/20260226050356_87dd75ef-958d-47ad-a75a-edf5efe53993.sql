
CREATE TABLE public.daily_seller_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id),
  date DATE NOT NULL,
  leads_generated INTEGER NOT NULL DEFAULT 0,
  leads_qualified INTEGER NOT NULL DEFAULT 0,
  meetings_scheduled INTEGER NOT NULL DEFAULT 0,
  meetings_completed INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_member_id, date)
);

ALTER TABLE public.daily_seller_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily_seller_kpis"
  ON public.daily_seller_kpis
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
