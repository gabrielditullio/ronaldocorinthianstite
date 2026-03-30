-- Table for imported Meta Ads campaign data
CREATE TABLE public.meta_ads_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL,
  report_start_date date NOT NULL,
  report_end_date date NOT NULL,
  campaign_name text NOT NULL,
  delivery_status text,
  results integer DEFAULT 0,
  result_indicator text,
  cost_per_result numeric DEFAULT 0,
  ad_set_budget numeric DEFAULT 0,
  budget_type text,
  amount_spent numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  end_date text,
  attribution_setting text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, campaign_name, report_start_date, report_end_date)
);

ALTER TABLE public.meta_ads_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ads_campaigns user access" ON public.meta_ads_campaigns
  FOR ALL TO public
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Add campaign tracking fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ad_set_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ad_name text;