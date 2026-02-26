
-- App settings table
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for banner, maintenance mode etc)
CREATE POLICY "Anyone can read settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins manage settings"
ON public.app_settings FOR ALL
TO authenticated
USING (public.is_admin_role(auth.uid()))
WITH CHECK (public.is_admin_role(auth.uid()));

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('checkout_url', '', 'URL do Checkout Assiny'),
  ('support_email', '', 'Email de Suporte'),
  ('maintenance_mode', 'false', 'Modo Manutenção'),
  ('maintenance_message', 'Sistema em manutenção. Voltaremos em breve.', 'Mensagem de Manutenção'),
  ('signup_enabled', 'true', 'Cadastros Abertos'),
  ('trial_days', '7', 'Dias de Trial'),
  ('product_price', '67', 'Preço do Produto (R$)'),
  ('banner_active', 'false', 'Banner Ativo'),
  ('banner_text', '', 'Texto do Banner'),
  ('banner_type', 'info', 'Tipo do Banner (info/warning/success)');

-- Benchmark configs table
CREATE TABLE public.benchmark_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_type text NOT NULL,
  metric_key text NOT NULL,
  level text NOT NULL,
  min_value numeric,
  max_value numeric,
  coaching_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_configs ENABLE ROW LEVEL SECURITY;

-- Everyone can read benchmarks
CREATE POLICY "Anyone can read benchmarks"
ON public.benchmark_configs FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins manage benchmarks"
ON public.benchmark_configs FOR ALL
TO authenticated
USING (public.is_admin_role(auth.uid()))
WITH CHECK (public.is_admin_role(auth.uid()));
