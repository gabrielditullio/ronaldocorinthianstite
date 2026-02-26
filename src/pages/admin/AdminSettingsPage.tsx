import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/sonner";
import { Save, RotateCcw, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { GUIDES, type GuideKey, type LevelKey } from "@/data/benchmarks";

// ─── General Settings Section ─────────────────────
function GeneralSettingsSection() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const [local, setLocal] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.key] = s.value; });
    setLocal(map);
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: local[key], updated_at: new Date().toISOString(), updated_by: profile?.id })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva!");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const set = (key: string, val: string) => setLocal((p) => ({ ...p, [key]: val }));

  const textSetting = (key: string, label: string, type: "text" | "number" | "textarea" = "text") => (
    <div className="flex items-end gap-3" key={key}>
      <div className="flex-1 space-y-1.5">
        <Label>{label}</Label>
        {type === "textarea" ? (
          <Textarea value={local[key] || ""} onChange={(e) => set(key, e.target.value)} rows={3} />
        ) : (
          <Input type={type} value={local[key] || ""} onChange={(e) => set(key, e.target.value)} />
        )}
      </div>
      <Button size="sm" onClick={() => saveSetting.mutate(key)} disabled={saveSetting.isPending}>
        <Save className="h-4 w-4 mr-1" /> Salvar
      </Button>
    </div>
  );

  const toggleSetting = (key: string, label: string) => (
    <div className="flex items-center justify-between" key={key}>
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Switch
          checked={local[key] === "true"}
          onCheckedChange={(v) => {
            set(key, v ? "true" : "false");
            saveSetting.mutate(key);
          }}
        />
        <span className="text-sm text-muted-foreground">{local[key] === "true" ? "Ativo" : "Inativo"}</span>
      </div>
    </div>
  );

  return (
    <Card className="bg-white">
      <CardHeader><CardTitle>Configurações Gerais</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {textSetting("checkout_url", "URL do Checkout Assiny")}
        {textSetting("support_email", "Email de Suporte")}
        <Separator />
        {toggleSetting("maintenance_mode", "Modo Manutenção")}
        {textSetting("maintenance_message", "Mensagem de Manutenção", "textarea")}
        <Separator />
        {toggleSetting("signup_enabled", "Cadastros Abertos")}
        {textSetting("trial_days", "Dias de Trial", "number")}
        {textSetting("product_price", "Preço do Produto (R$)", "number")}
      </CardContent>
    </Card>
  );
}

// ─── Banner Section ───────────────────────────────
function BannerSection() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const [local, setLocal] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.key] = s.value; });
    setLocal(map);
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: local[key], updated_at: new Date().toISOString(), updated_by: profile?.id })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva!");
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const set = (key: string, val: string) => setLocal((p) => ({ ...p, [key]: val }));

  const bannerIcon = local.banner_type === "warning" ? <AlertTriangle className="h-4 w-4" /> :
    local.banner_type === "success" ? <CheckCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />;

  const bannerVariant = local.banner_type === "warning" ? "destructive" as const : "default" as const;

  return (
    <Card className="bg-white">
      <CardHeader><CardTitle>Banner / Notificações</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <Label>Banner Ativo</Label>
          <Switch
            checked={local.banner_active === "true"}
            onCheckedChange={(v) => {
              set("banner_active", v ? "true" : "false");
              saveSetting.mutate("banner_active");
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Texto do Banner</Label>
          <div className="flex gap-3">
            <Input className="flex-1" value={local.banner_text || ""} onChange={(e) => set("banner_text", e.target.value)} />
            <Button size="sm" onClick={() => saveSetting.mutate("banner_text")}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo do Banner</Label>
          <div className="flex gap-3">
            <Select value={local.banner_type || "info"} onValueChange={(v) => { set("banner_type", v); saveSetting.mutate("banner_type"); }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        {local.banner_text && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
            <Alert variant={bannerVariant}>
              {bannerIcon}
              <AlertDescription>{local.banner_text}</AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Benchmarks Editor Section ─────────────────────
function BenchmarksEditorSection() {
  const queryClient = useQueryClient();
  const [funnelType, setFunnelType] = useState<GuideKey>("high_ticket");

  const { data: dbConfigs = [] } = useQuery({
    queryKey: ["benchmark-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("benchmark_configs").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Local editable state keyed by `${metric_key}_${level}`
  const [edits, setEdits] = useState<Record<string, { min: string; max: string; coaching: string }>>({});

  const guideData = GUIDES[funnelType];

  useEffect(() => {
    const map: Record<string, { min: string; max: string; coaching: string }> = {};
    guideData.metrics.forEach((m) => {
      m.levels.forEach((l) => {
        const dbRow = dbConfigs.find(
          (c: any) => c.funnel_type === funnelType && c.metric_key === m.key && c.level === l.key
        );
        const key = `${m.key}_${l.key}`;
        map[key] = {
          min: dbRow ? String(dbRow.min_value ?? "") : String(l.min ?? ""),
          max: dbRow ? String(dbRow.max_value ?? "") : String(l.max ?? ""),
          coaching: dbRow ? dbRow.coaching_text : l.coaching,
        };
      });
    });
    setEdits(map);
  }, [funnelType, dbConfigs, guideData.metrics]);

  const saveMetric = useMutation({
    mutationFn: async (metricKey: string) => {
      const metric = guideData.metrics.find((m) => m.key === metricKey);
      if (!metric) return;

      for (const level of metric.levels) {
        const e = edits[`${metricKey}_${level.key}`];
        if (!e) continue;

        const existing = dbConfigs.find(
          (c: any) => c.funnel_type === funnelType && c.metric_key === metricKey && c.level === level.key
        );

        const row = {
          funnel_type: funnelType,
          metric_key: metricKey,
          level: level.key,
          min_value: e.min === "" ? null : Number(e.min),
          max_value: e.max === "" ? null : Number(e.max),
          coaching_text: e.coaching,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase.from("benchmark_configs").update(row).eq("id", (existing as any).id);
        } else {
          await supabase.from("benchmark_configs").insert(row);
        }
      }
    },
    onSuccess: () => {
      toast.success("Benchmark salvo!");
      queryClient.invalidateQueries({ queryKey: ["benchmark-configs"] });
    },
    onError: () => toast.error("Erro ao salvar benchmark."),
  });

  const resetMetric = useMutation({
    mutationFn: async (metricKey: string) => {
      await supabase
        .from("benchmark_configs")
        .delete()
        .eq("funnel_type", funnelType)
        .eq("metric_key", metricKey);
    },
    onSuccess: () => {
      toast.success("Restaurado ao padrão!");
      queryClient.invalidateQueries({ queryKey: ["benchmark-configs"] });
    },
  });

  const setEdit = (key: string, field: "min" | "max" | "coaching", val: string) => {
    setEdits((p) => ({ ...p, [key]: { ...p[key], [field]: val } }));
  };

  const levelLabels: Record<string, string> = {
    pessimo: "Péssimo", ruim: "Ruim", bom: "Bom", otimo: "Ótimo", excelente: "Excelente",
  };
  const levelColors: Record<string, string> = {
    pessimo: "bg-red-100 text-red-700", ruim: "bg-orange-100 text-orange-700",
    bom: "bg-blue-100 text-blue-700", otimo: "bg-emerald-100 text-emerald-700",
    excelente: "bg-green-100 text-green-700",
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Benchmarks Editáveis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={funnelType} onValueChange={(v) => setFunnelType(v as GuideKey)}>
          <TabsList>
            <TabsTrigger value="high_ticket">High Ticket</TabsTrigger>
            <TabsTrigger value="diagnostic">Diagnóstico</TabsTrigger>
          </TabsList>
        </Tabs>

        {guideData.metrics.map((metric) => (
          <div key={metric.key} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground">{metric.label}</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => resetMetric.mutate(metric.key)} disabled={resetMetric.isPending}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Restaurar Padrão
                </Button>
                <Button size="sm" onClick={() => saveMetric.mutate(metric.key)} disabled={saveMetric.isPending}>
                  <Save className="h-3 w-3 mr-1" /> Salvar Alterações
                </Button>
              </div>
            </div>

            {metric.levels.map((level) => {
              const editKey = `${metric.key}_${level.key}`;
              const e = edits[editKey];
              if (!e) return null;
              return (
                <div key={level.key} className="border-l-4 pl-3 space-y-2" style={{ borderColor: "var(--border)" }}>
                  <Badge className={levelColors[level.key]}>{levelLabels[level.key]}</Badge>
                  <div className="flex gap-3">
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Min</Label>
                      <Input type="number" value={e.min} onChange={(ev) => setEdit(editKey, "min", ev.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Max</Label>
                      <Input type="number" value={e.max} onChange={(ev) => setEdit(editKey, "max", ev.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Coaching</Label>
                    <Textarea value={e.coaching} onChange={(ev) => setEdit(editKey, "coaching", ev.target.value)} rows={2} className="text-sm" />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────
export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <GeneralSettingsSection />
        <Separator />
        <BannerSection />
        <Separator />
        <BenchmarksEditorSection />
      </div>
    </AdminLayout>
  );
}
