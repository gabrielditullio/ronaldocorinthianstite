import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoMIndicator } from "@/components/MoMIndicator";
import { toast } from "sonner";
import { Save, Lightbulb } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface MetricDef {
  key: string;
  label: string;
  suffix: string;
  good: "high" | "low";
  thresholds: [number, number]; // [warning, good]
}

const METRICS: MetricDef[] = [
  { key: "form_completion_rate", label: "Taxa de Finalização do Formulário", suffix: "%", good: "high", thresholds: [50, 70] },
  { key: "scheduling_rate", label: "Taxa de Agendamento", suffix: "%", good: "high", thresholds: [20, 35] },
  { key: "attendance_rate", label: "Comparecimento", suffix: "%", good: "high", thresholds: [60, 75] },
  { key: "noshow_confirmed", label: "No Show — Confirmados", suffix: "%", good: "low", thresholds: [20, 10] },
  { key: "noshow_unconfirmed", label: "No Show — Não Confirmados", suffix: "%", good: "low", thresholds: [40, 25] },
  { key: "reschedule_rate", label: "Reagendamentos", suffix: "%", good: "low", thresholds: [25, 15] },
  { key: "recorded_calls_rate", label: "Calls Gravadas", suffix: "%", good: "high", thresholds: [70, 85] },
  { key: "confirmation_rate", label: "Taxa de Confirmação", suffix: "%", good: "high", thresholds: [65, 80] },
  { key: "avg_ticket", label: "Ticket Médio", suffix: "", good: "high", thresholds: [5000, 9000] },
];

function getBadge(metric: MetricDef, value: number | null) {
  if (value == null) return null;
  const [warn, good] = metric.thresholds;
  if (metric.good === "high") {
    if (value >= good) return { label: "Excelente", color: "bg-green-50 text-green-700 border-green-200" };
    if (value >= warn) return { label: "Atenção", color: "bg-orange-50 text-orange-700 border-orange-200" };
    return { label: "Crítico", color: "bg-red-50 text-red-700 border-red-200" };
  } else {
    if (value <= good) return { label: "Excelente", color: "bg-green-50 text-green-700 border-green-200" };
    if (value <= warn) return { label: "Atenção", color: "bg-orange-50 text-orange-700 border-orange-200" };
    return { label: "Crítico", color: "bg-red-50 text-red-700 border-red-200" };
  }
}

function fmtValue(value: number | null, suffix: string) {
  if (value == null) return "—";
  if (suffix === "") return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  return `${value}${suffix}`;
}

export default function SessionMetricsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [values, setValues] = useState<Record<string, string>>({});

  // Fetch current month data
  const { data: currentData } = useQuery({
    queryKey: ["session-metrics", user?.id, month, year],
    queryFn: async () => {
      const { data } = await (supabase.from("session_metrics") as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("month", month)
        .eq("year", year)
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
    enabled: !!user,
  });

  // Fetch previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { data: prevData } = useQuery({
    queryKey: ["session-metrics", user?.id, prevMonth, prevYear],
    queryFn: async () => {
      const { data } = await (supabase.from("session_metrics") as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("month", prevMonth)
        .eq("year", prevYear)
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
    enabled: !!user,
  });

  // Fetch last 6 months for sparklines
  const { data: history = [] } = useQuery({
    queryKey: ["session-metrics-history", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("session_metrics") as any)
        .select("*")
        .eq("user_id", user!.id)
        .not("month", "is", null)
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .limit(12);
      return data || [];
    },
    enabled: !!user,
  });

  // Populate form when data loads
  useEffect(() => {
    if (currentData) {
      const v: Record<string, string> = {};
      METRICS.forEach(m => {
        const val = (currentData as any)[m.key];
        v[m.key] = val != null ? String(val) : "";
      });
      setValues(v);
    } else {
      setValues({});
    }
  }, [currentData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const record: any = { user_id: user!.id, month, year };
      METRICS.forEach(m => {
        const v = parseFloat(values[m.key]?.replace(",", ".") || "");
        record[m.key] = isNaN(v) ? null : v;
      });

      if (currentData?.id) {
        const { error } = await supabase.from("session_metrics").update(record).eq("id", currentData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("session_metrics").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["session-metrics-history"] });
      toast.success("Métricas salvas com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  // Worst metric insight
  const insight = useMemo(() => {
    let worst: { metric: MetricDef; score: number } | null = null;
    METRICS.forEach(m => {
      const v = parseFloat(values[m.key] || "");
      if (isNaN(v)) return;
      const badge = getBadge(m, v);
      const score = badge?.label === "Crítico" ? 0 : badge?.label === "Atenção" ? 1 : 2;
      if (!worst || score < worst.score || (score === worst.score && m.good === "high" && v < parseFloat(values[worst.metric.key] || "999"))) {
        worst = { metric: m, score };
      }
    });
    if (!worst || (worst as any).score >= 2) return null;
    const m = (worst as any).metric as MetricDef;
    const actions: Record<string, string> = {
      form_completion_rate: "Simplifique o formulário: reduza campos obrigatórios e adicione preenchimento automático.",
      scheduling_rate: "Melhore o CTA de agendamento e reduza etapas até o calendário.",
      attendance_rate: "Implemente lembretes via WhatsApp 24h e 1h antes da reunião.",
      noshow_confirmed: "Envie confirmação ativa no dia anterior com opção de reagendamento.",
      noshow_unconfirmed: "Adicione múltiplos canais de confirmação (SMS, email, WhatsApp).",
      reschedule_rate: "Ofereça horários mais flexíveis e reduza o prazo entre agendamento e reunião.",
      recorded_calls_rate: "Padronize o uso de ferramentas de gravação e treine a equipe.",
      confirmation_rate: "Automatize o fluxo de confirmação com sequência multicanal.",
      avg_ticket: "Revise o posicionamento de preço e explore upsell/cross-sell.",
    };
    return { metric: m, action: actions[m.key] || "Analise essa métrica com sua equipe." };
  }, [values]);

  const sparkData = useMemo(() => {
    const result: Record<string, { label: string; value: number }[]> = {};
    METRICS.forEach(m => { result[m.key] = []; });
    (history as any[]).forEach((row: any) => {
      const label = `${String(row.month).padStart(2, "0")}/${row.year}`;
      METRICS.forEach(m => {
        if (row[m.key] != null) {
          result[m.key].push({ label, value: Number(row[m.key]) });
        }
      });
    });
    return result;
  }, [history]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sessão Estratégica</h1>
            <p className="text-muted-foreground">Métricas granulares do processo pré-venda</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Input Form */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Suas Métricas — {MONTHS[month - 1]} {year}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {METRICS.map(m => (
                <div key={m.key} className="space-y-1.5">
                  <Label className="text-sm">{m.label} {m.suffix ? `(${m.suffix})` : "(R$)"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={m.suffix === "" ? "100" : "0.1"}
                    placeholder="0"
                    value={values[m.key] || ""}
                    onChange={e => setValues(prev => ({ ...prev, [m.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Salvando..." : "Salvar Métricas"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Insight */}
        {insight && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Prioridade: {insight.metric.label}
                </p>
                <p className="text-sm text-amber-800 mt-0.5">{insight.action}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {METRICS.map(m => {
            const raw = parseFloat(values[m.key]?.replace(",", ".") || "");
            const val = isNaN(raw) ? null : raw;
            const badge = getBadge(m, val);
            const prev = prevData ? Number((prevData as any)[m.key]) : null;
            const prevVal = prev != null && !isNaN(prev) ? prev : null;
            const spark = sparkData[m.key];

            return (
              <Card key={m.key}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{m.label}</p>
                    {badge && (
                      <Badge variant="outline" className={`text-[10px] ${badge.color}`}>{badge.label}</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{fmtValue(val, m.suffix)}</p>
                  <MoMIndicator
                    current={val}
                    previous={prevVal}
                    format={v => fmtValue(v, m.suffix)}
                    invertColor={m.good === "low"}
                  />
                  {spark.length >= 2 && (
                    <div className="pt-1">
                      <ResponsiveContainer width="100%" height={40}>
                        <LineChart data={spark}>
                          <Tooltip
                            formatter={(v: number) => fmtValue(v, m.suffix)}
                            labelFormatter={(l) => l}
                            contentStyle={{ fontSize: 11 }}
                          />
                          <Line type="monotone" dataKey="value" stroke="#7c3043" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
