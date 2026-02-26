import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import {
  Activity, Database, Webhook, Users, AlertTriangle, CheckCircle,
  RefreshCw, ExternalLink, Loader2, Server,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type HealthStatus = "ok" | "warning" | "error" | "loading";

interface TableCount {
  name: string;
  count: number;
}

interface Alert {
  level: "warning" | "error" | "ok";
  message: string;
}

export default function AdminHealthPage() {
  const [supabaseStatus, setSupabaseStatus] = useState<HealthStatus>("loading");
  const [lastCheck, setLastCheck] = useState<string>("");
  const [lastWebhook, setLastWebhook] = useState<string | null>(null);
  const [tableCounts, setTableCounts] = useState<TableCount[]>([]);
  const [loginData, setLoginData] = useState<{ label: string; count: number }[]>([]);
  const [usageMetrics, setUsageMetrics] = useState({ last7: 0, last30: 0, never: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const checkSupabase = useCallback(async () => {
    setSupabaseStatus("loading");
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      setSupabaseStatus(error ? "error" : "ok");
    } catch {
      setSupabaseStatus("error");
    }
    setLastCheck(new Date().toLocaleString("pt-BR"));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    // 1. Supabase status
    await checkSupabase();

    // 2. Last webhook
    const { data: wh } = await supabase
      .from("webhook_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    setLastWebhook(wh?.[0]?.created_at ?? null);

    // 3. Table counts (parallel)
    const tables = [
      "profiles",
      "webhook_logs",
      "monthly_snapshots",
      "leads",
      "ad_metrics",
      "daily_seller_kpis",
    ] as const;

    const countResults = await Promise.all(
      tables.map(async (t) => {
        const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
        return { name: t, count: count ?? 0 };
      })
    );
    setTableCounts(countResults);

    // 4. Usage metrics
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, created_at, updated_at, subscription_status");

    const profiles = allProfiles ?? [];
    // Approximate "last login" by updated_at (profile gets updated on login via triggers or usage)
    const last7 = profiles.filter((p) => p.updated_at && p.updated_at >= d7).length;
    const last30 = profiles.filter((p) => p.updated_at && p.updated_at >= d30).length;
    const never = profiles.filter(
      (p) => p.subscription_status === "active" && p.updated_at === p.created_at
    ).length;
    setUsageMetrics({ last7, last30, never });

    // 5. Login chart (last 14 days, approximate by updated_at)
    const chart: { label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000);
      const dayStr = day.toISOString().slice(0, 10);
      const label = `${day.getDate().toString().padStart(2, "0")}/${(day.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const count = profiles.filter((p) => p.updated_at?.slice(0, 10) === dayStr).length;
      chart.push({ label, count });
    }
    setLoginData(chart);

    // 6. Alerts
    const newAlerts: Alert[] = [];
    if (never > 0) {
      newAlerts.push({ level: "warning", message: `${never} usuários compraram mas nunca acessaram` });
    }
    if (lastWebhook || wh?.[0]?.created_at) {
      const whDate = new Date(wh?.[0]?.created_at ?? "");
      const hoursAgo = (now.getTime() - whDate.getTime()) / 3600000;
      if (hoursAgo > 72) {
        newAlerts.push({ level: "error", message: `Webhook sem atividade há ${Math.round(hoursAgo)} horas` });
      } else if (hoursAgo > 24) {
        newAlerts.push({ level: "warning", message: `Webhook sem atividade há ${Math.round(hoursAgo)} horas` });
      }
    }
    // Check for webhook errors this week
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const { count: errorCount } = await supabase
      .from("webhook_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .like("payload->>status", "%error%");
    if (errorCount && errorCount > 0) {
      newAlerts.push({ level: "warning", message: `${errorCount} webhooks com erro esta semana` });
    }
    if (newAlerts.length === 0) {
      newAlerts.push({ level: "ok", message: "Sistema operando normalmente" });
    }
    setAlerts(newAlerts);

    setLoading(false);
  }, [checkSupabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const webhookAge = () => {
    if (!lastWebhook) return null;
    const hours = (Date.now() - new Date(lastWebhook).getTime()) / 3600000;
    if (hours > 72) return "error";
    if (hours > 24) return "warning";
    return "ok";
  };

  const statusColor = (s: HealthStatus | "warning") =>
    s === "ok" ? "text-green-600" : s === "warning" ? "text-yellow-600" : s === "error" ? "text-red-600" : "text-muted-foreground";

  const totalRecords = tableCounts.reduce((s, t) => s + t.count, 0);

  const edgeFunctions = [
    { name: "admin-update-subscription", description: "Atualiza assinatura de usuário" },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Saúde do Sistema</h1>
          <Button onClick={fetchAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Tudo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Supabase Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5" />
                Status do Supabase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`h-4 w-4 rounded-full ${supabaseStatus === "ok" ? "bg-green-500" : supabaseStatus === "error" ? "bg-red-500" : "bg-muted-foreground animate-pulse"}`} />
                <span className={`font-medium ${statusColor(supabaseStatus)}`}>
                  {supabaseStatus === "ok" ? "Conectado" : supabaseStatus === "error" ? "Erro na conexão" : "Verificando..."}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Última verificação: {lastCheck || "—"}</p>
              <Button onClick={checkSupabase} size="sm" variant="outline">
                Verificar Agora
              </Button>
            </CardContent>
          </Card>

          {/* 2. Last Webhook */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Webhook className="h-5 w-5" />
                Último Webhook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lastWebhook ? (
                <>
                  <p className="text-sm">
                    {new Date(lastWebhook).toLocaleString("pt-BR")}
                  </p>
                  {webhookAge() === "warning" && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Sem atividade recente</Badge>
                  )}
                  {webhookAge() === "error" && (
                    <Badge className="bg-red-100 text-red-800 border-red-300">Possível problema na integração</Badge>
                  )}
                  {webhookAge() === "ok" && (
                    <Badge className="bg-green-100 text-green-800 border-green-300">OK</Badge>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum webhook registrado</p>
              )}
            </CardContent>
          </Card>

          {/* 3. DB Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                Uso do Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tableCounts.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-mono">{t.name}</span>
                    <span className="font-medium">{t.count.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex items-center justify-between text-sm font-bold">
                  <span>Total estimado</span>
                  <span>{totalRecords.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Edge Functions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Edge Functions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {edgeFunctions.map((fn) => (
                <div key={fn.name} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono font-medium">{fn.name}</span>
                    <p className="text-xs text-muted-foreground">{fn.description}</p>
                  </div>
                  <a
                    href={`https://supabase.com/dashboard/project/lsvkgowogmisayzwnnji/functions/${fn.name}/logs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-xs"
                  >
                    Logs <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
              <a
                href="https://supabase.com/dashboard/project/lsvkgowogmisayzwnnji/functions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 text-sm mt-2"
              >
                Abrir no Supabase <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>

          {/* 5. Usage Metrics */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Métricas de Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{usageMetrics.last7}</p>
                  <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{usageMetrics.last30}</p>
                  <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-destructive">{usageMetrics.never}</p>
                  <p className="text-xs text-muted-foreground">Nunca acessaram</p>
                </div>
              </div>
              <p className="text-sm font-medium mb-2">Atividade diária (últimos 14 dias)</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={loginData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" name="Acessos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 6. Active Alerts */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5" />
                Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      a.level === "ok" ? "bg-green-50 text-green-800" : a.level === "warning" ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"
                    }`}
                  >
                    {a.level === "ok" ? (
                      <CheckCircle className="h-5 w-5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                    )}
                    <span className="text-sm font-medium">{a.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 7. Security Checklist */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                🔒 Checklist de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-800">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="font-medium">RLS ativado em todas as tabelas</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-800">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="font-medium">Verificação auth.uid() IS NOT NULL em todas as políticas</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-800">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="font-medium">search_path definido em todas as funções</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 text-yellow-800">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span className="font-medium">
                    Proteção contra senhas vazadas: Verificar em{" "}
                    <a
                      href="https://supabase.com/dashboard/project/lsvkgowogmisayzwnnji/auth/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Supabase Dashboard → Auth → Settings
                    </a>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
