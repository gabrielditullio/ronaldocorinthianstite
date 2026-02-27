
-- 1. Create funnels table
CREATE TABLE public.funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  name text NOT NULL,
  funnel_type text NOT NULL DEFAULT 'high_ticket',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT funnels_type_check CHECK (funnel_type IN ('high_ticket', 'diagnostic', 'low_ticket', 'launch', 'perpetual', 'custom'))
);

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnels user access" ON public.funnels
FOR ALL USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE INDEX idx_funnels_user_id ON public.funnels(user_id);

-- 2. Add funnel_id to existing tables
ALTER TABLE public.monthly_snapshots ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);
ALTER TABLE public.leads ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);
ALTER TABLE public.pipeline_meetings ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);
ALTER TABLE public.ad_metrics ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);
ALTER TABLE public.daily_seller_kpis ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);
ALTER TABLE public.sales_channels ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);
ALTER TABLE public.channel_monthly_data ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);
ALTER TABLE public.session_metrics ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);
ALTER TABLE public.goal_simulations ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);

-- 3. Seed default funnel for each existing user and update existing records
DO $$
DECLARE
  rec RECORD;
  new_funnel_id uuid;
BEGIN
  FOR rec IN SELECT id FROM public.profiles LOOP
    INSERT INTO public.funnels (user_id, name, funnel_type, description)
    VALUES (rec.id, 'Funil Principal', 'high_ticket', 'Funil padrão criado automaticamente')
    RETURNING id INTO new_funnel_id;

    UPDATE public.monthly_snapshots SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
    UPDATE public.leads SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
    UPDATE public.pipeline_meetings SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
    UPDATE public.ad_metrics SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
    UPDATE public.daily_seller_kpis SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
    UPDATE public.sales_channels SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
    UPDATE public.channel_monthly_data SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
    UPDATE public.session_metrics SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
    UPDATE public.goal_simulations SET funnel_id = new_funnel_id WHERE user_id = rec.id AND funnel_id IS NULL;
  END LOOP;
END $$;
