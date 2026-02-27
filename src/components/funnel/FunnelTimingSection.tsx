import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Zap, Turtle, AlertTriangle } from "lucide-react";
import { stageLabels } from "@/utils/translations";

const STAGE_ORDER = ["lead", "qualification", "meeting", "proposal", "closed_won"];

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-blue-500", text: "text-blue-700" },
  qualification: { bg: "bg-purple-500", text: "text-purple-700" },
  meeting: { bg: "bg-indigo-500", text: "text-indigo-700" },
  proposal: { bg: "bg-orange-500", text: "text-orange-700" },
  closed_won: { bg: "bg-green-500", text: "text-green-700" },
};

interface Transition {
  lead_id: string;
  from_stage: string | null;
  to_stage: string;
  transitioned_at: string;
}

interface Lead {
  id: string;
  stage: string;
  created_at: string | null;
}

function computeMetrics(transitions: Transition[], leads: Lead[], onlyConverted: boolean) {
  // Filter leads
  const relevantLeads = onlyConverted
    ? leads.filter((l) => l.stage === "closed_won")
    : leads;
  const relevantLeadIds = new Set(relevantLeads.map((l) => l.id));

  // Group transitions by lead
  const byLead: Record<string, Transition[]> = {};
  for (const t of transitions) {
    if (!relevantLeadIds.has(t.lead_id)) continue;
    if (!byLead[t.lead_id]) byLead[t.lead_id] = [];
    byLead[t.lead_id].push(t);
  }

  // For each lead, compute days per stage
  const stageDaysAccum: Record<string, number[]> = {};
  STAGE_ORDER.forEach((s) => (stageDaysAccum[s] = []));

  const cycleDays: number[] = [];

  for (const [leadId, trans] of Object.entries(byLead)) {
    const sorted = [...trans].sort(
      (a, b) => new Date(a.transitioned_at).getTime() - new Date(b.transitioned_at).getTime()
    );

    const lead = relevantLeads.find((l) => l.id === leadId);
    if (!lead) continue;

    // Build timeline: start at created_at
    const startTime = new Date(lead.created_at || sorted[0].transitioned_at).getTime();
    let totalCycle = 0;

    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      const stage = t.from_stage || "lead";
      const prevTime = i === 0 ? startTime : new Date(sorted[i - 1].transitioned_at).getTime();
      const curTime = new Date(t.transitioned_at).getTime();
      const days = Math.max(0, (curTime - prevTime) / (1000 * 60 * 60 * 24));

      if (stageDaysAccum[stage]) {
        stageDaysAccum[stage].push(days);
      }
      totalCycle += days;
    }

    if (totalCycle > 0) cycleDays.push(totalCycle);
  }

  // Compute averages
  const stageAvg: { stage: string; avgDays: number }[] = [];
  for (const stage of STAGE_ORDER) {
    const arr = stageDaysAccum[stage];
    const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    stageAvg.push({ stage, avgDays: Math.round(avg * 10) / 10 });
  }

  const totalAvg = cycleDays.length > 0 ? cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length : 0;
  const fastest = cycleDays.length > 0 ? Math.min(...cycleDays) : 0;
  const slowest = cycleDays.length > 0 ? Math.max(...cycleDays) : 0;

  // Find bottleneck
  const bottleneck = stageAvg.reduce((max, s) => (s.avgDays > max.avgDays ? s : max), stageAvg[0]);

  return { stageAvg, totalAvg, fastest, slowest, bottleneck, hasData: cycleDays.length > 0 };
}

export function FunnelTimingSection() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "converted">("all");

  const { data: transitions = [] } = useQuery({
    queryKey: ["lead_stage_transitions", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lead_stage_transitions")
        .select("lead_id, from_stage, to_stage, transitioned_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as Transition[];
    },
    enabled: !!user,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads_for_timing", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, stage, created_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!user,
  });

  const metrics = useMemo(
    () => computeMetrics(transitions, leads, filter === "converted"),
    [transitions, leads, filter]
  );

  const maxDays = Math.max(...metrics.stageAvg.map((s) => s.avgDays), 1);

  if (!metrics.hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Tempo Médio por Etapa do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Ainda não há dados de transições de etapa. Mova leads entre etapas para gerar análises.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Tempo Médio por Etapa do Funil
        </CardTitle>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "converted")}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3">Todos os leads</TabsTrigger>
            <TabsTrigger value="converted" className="text-xs px-3">Apenas convertidos</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Ciclo Médio Total</p>
              <p className="text-xl font-bold">{Math.round(metrics.totalAvg)} dias</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Zap className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Ciclo Mais Rápido</p>
              <p className="text-xl font-bold">{Math.round(metrics.fastest)} dias</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Turtle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Ciclo Mais Lento</p>
              <p className="text-xl font-bold">{Math.round(metrics.slowest)} dias</p>
            </div>
          </div>
        </div>

        {/* Horizontal bar chart */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 flex-wrap">
            {metrics.stageAvg.map((s, i) => {
              const widthPct = Math.max((s.avgDays / maxDays) * 100, 8);
              const color = STAGE_COLORS[s.stage] || { bg: "bg-gray-500", text: "text-gray-700" };
              const isBottleneck = s.stage === metrics.bottleneck.stage && s.avgDays > 0;
              return (
                <div key={s.stage} className="flex items-center gap-0">
                  <div
                    className={`${color.bg} text-white text-xs font-medium px-2 py-2 rounded ${isBottleneck ? "ring-2 ring-orange-400" : ""}`}
                    style={{ minWidth: `${widthPct}%`, flex: `${widthPct} 0 0` }}
                  >
                    <div className="truncate">{stageLabels[s.stage] || s.stage}</div>
                    <div className="font-bold">{s.avgDays} dias</div>
                  </div>
                  {i < metrics.stageAvg.length - 1 && (
                    <span className="text-muted-foreground mx-0.5 text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Insight */}
        {metrics.bottleneck.avgDays > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-200 p-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">
              O gargalo do seu funil está em{" "}
              <strong>{stageLabels[metrics.bottleneck.stage] || metrics.bottleneck.stage}</strong>.
              Leads ficam em média <strong>{Math.round(metrics.bottleneck.avgDays)} dias</strong> nessa etapa.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
