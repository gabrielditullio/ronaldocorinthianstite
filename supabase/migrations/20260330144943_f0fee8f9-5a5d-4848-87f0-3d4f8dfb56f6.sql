CREATE TABLE public.channel_weekly_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_id uuid REFERENCES public.sales_channels(id) ON DELETE CASCADE NOT NULL,
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL,
  month_year text NOT NULL,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 5),
  leads_total integer DEFAULT 0,
  leads_total_meta integer DEFAULT 0,
  leads_qualified integer DEFAULT 0,
  leads_qualified_meta integer DEFAULT 0,
  calls_scheduled integer DEFAULT 0,
  calls_scheduled_meta integer DEFAULT 0,
  calls_completed integer DEFAULT 0,
  calls_completed_meta integer DEFAULT 0,
  attendance_rate numeric DEFAULT 0,
  attendance_rate_meta numeric DEFAULT 0,
  sales integer DEFAULT 0,
  sales_meta integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  conversion_rate_meta numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, month_year, week_number)
);

ALTER TABLE public.channel_weekly_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own channel_weekly_kpis"
  ON public.channel_weekly_kpis
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);