
CREATE TABLE IF NOT EXISTS public.sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sales_channels"
  ON public.sales_channels FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.channel_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  channel_id UUID NOT NULL REFERENCES public.sales_channels(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  target NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, month, year)
);

ALTER TABLE public.channel_monthly_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own channel_monthly_data"
  ON public.channel_monthly_data FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
