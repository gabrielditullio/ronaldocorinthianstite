
-- 1. webhook_logs: RLS is already enabled per schema, but let's ensure + fix policies
-- Drop existing policies
DROP POLICY IF EXISTS "Admins view all webhook logs" ON webhook_logs;

-- Revoke anon access
REVOKE ALL ON webhook_logs FROM anon;

-- Admin SELECT
CREATE POLICY "Only admins can read webhook logs"
ON webhook_logs FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Service role INSERT (WITH CHECK true for authenticated, anon revoked above)
CREATE POLICY "Service role can insert webhook logs"
ON webhook_logs FOR INSERT
WITH CHECK (true);

-- Admin DELETE
CREATE POLICY "Only admins can delete webhook logs"
ON webhook_logs FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 2. Fix all user-table RLS policies with explicit auth.uid() IS NOT NULL

-- leads
DROP POLICY IF EXISTS "Users manage own leads" ON leads;
CREATE POLICY "leads user access" ON leads FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- diagnostics
DROP POLICY IF EXISTS "Users manage own diagnostics" ON diagnostics;
CREATE POLICY "diagnostics user access" ON diagnostics FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- pipeline_meetings
DROP POLICY IF EXISTS "Users manage own meetings" ON pipeline_meetings;
CREATE POLICY "pipeline_meetings user access" ON pipeline_meetings FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- monthly_snapshots
DROP POLICY IF EXISTS "Users manage own snapshots" ON monthly_snapshots;
CREATE POLICY "monthly_snapshots user access" ON monthly_snapshots FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- cac_calculations
DROP POLICY IF EXISTS "Users manage own cac" ON cac_calculations;
CREATE POLICY "cac_calculations user access" ON cac_calculations FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- goal_simulations
DROP POLICY IF EXISTS "Users manage own simulations" ON goal_simulations;
CREATE POLICY "goal_simulations user access" ON goal_simulations FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- team_members
DROP POLICY IF EXISTS "Users manage own team" ON team_members;
CREATE POLICY "team_members user access" ON team_members FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ad_metrics
DROP POLICY IF EXISTS "Users can delete own ad metrics" ON ad_metrics;
DROP POLICY IF EXISTS "Users can insert own ad metrics" ON ad_metrics;
DROP POLICY IF EXISTS "Users can update own ad metrics" ON ad_metrics;
DROP POLICY IF EXISTS "Users can view own ad metrics" ON ad_metrics;
CREATE POLICY "ad_metrics user access" ON ad_metrics FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- daily_seller_kpis
DROP POLICY IF EXISTS "Users manage own daily_seller_kpis" ON daily_seller_kpis;
CREATE POLICY "daily_seller_kpis user access" ON daily_seller_kpis FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- sales_channels
DROP POLICY IF EXISTS "Users manage own sales_channels" ON sales_channels;
CREATE POLICY "sales_channels user access" ON sales_channels FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- channel_monthly_data
DROP POLICY IF EXISTS "Users manage own channel_monthly_data" ON channel_monthly_data;
CREATE POLICY "channel_monthly_data user access" ON channel_monthly_data FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- session_metrics
DROP POLICY IF EXISTS "Users manage own session_metrics" ON session_metrics;
CREATE POLICY "session_metrics user access" ON session_metrics FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- notification_reads
DROP POLICY IF EXISTS "Users manage own reads" ON notification_reads;
DROP POLICY IF EXISTS "Admins read all notification reads" ON notification_reads;
CREATE POLICY "notification_reads user access" ON notification_reads FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "notification_reads admin read" ON notification_reads FOR SELECT
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- admin_action_logs
DROP POLICY IF EXISTS "Admins manage action logs" ON admin_action_logs;
CREATE POLICY "admin_action_logs admin access" ON admin_action_logs FOR ALL
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- benchmark_configs
DROP POLICY IF EXISTS "Admins manage benchmarks" ON benchmark_configs;
DROP POLICY IF EXISTS "Anyone can read benchmarks" ON benchmark_configs;
CREATE POLICY "benchmark_configs admin access" ON benchmark_configs FOR ALL
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "benchmark_configs read" ON benchmark_configs FOR SELECT
USING (auth.uid() IS NOT NULL);

-- app_settings
DROP POLICY IF EXISTS "Admins manage settings" ON app_settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON app_settings;
CREATE POLICY "app_settings admin access" ON app_settings FOR ALL
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "app_settings read" ON app_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- notifications
DROP POLICY IF EXISTS "Admins manage notifications" ON notifications;
DROP POLICY IF EXISTS "Users read active notifications" ON notifications;
CREATE POLICY "notifications admin access" ON notifications FOR ALL
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "notifications read" ON notifications FOR SELECT
USING (auth.uid() IS NOT NULL);

-- profiles
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON profiles;
CREATE POLICY "profiles user select" ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND id = auth.uid());
CREATE POLICY "profiles user update" ON profiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND id = auth.uid());
CREATE POLICY "profiles admin select" ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "profiles admin update" ON profiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Revoke anon on sensitive tables
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON admin_action_logs FROM anon;
REVOKE ALL ON app_settings FROM anon;
REVOKE ALL ON benchmark_configs FROM anon;
REVOKE ALL ON notifications FROM anon;

-- 3. Fix function search paths
DO $$
DECLARE
  func record;
BEGIN
  FOR func IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', func.proname, func.args);
  END LOOP;
END $$;
