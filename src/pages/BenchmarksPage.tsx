import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GUIDES, classifyValue, levelToScore, scoreToPercent, type GuideKey } from "@/data/benchmarks";

const badgeStyles: Record<string, string> = {
  red: "bg-red-50 text-red-600 border-red-200 hover:bg-red-50",
  orange: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-50",
  blue: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50",
  green: "bg-green-50 text-green-600 border-green-200 hover:bg-green-50",
};

const barColors: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  green: "bg-green-500",
};

export default function BenchmarksPage() {
  const { profile } = useAuth();
  const [guide, setGuide] = useState<GuideKey>("high_ticket");
  const [values, setValues] = useState<Record<string, string>>({
    conversion_lead_sale: "",
    scheduling_rate: "",
    show_rate: "",
    close_rate: "",
    goal_achievement: "",
    cash_collection: "",
    cac_commercial: "",
  });

  // Pre-populate from latest monthly snapshot
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from("monthly_snapshots")
        .select("qualification_rate, close_rate")
        .eq("user_id", profile.id)
        .order("month_year", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const snap = data[0];
        setValues((prev) => ({
          ...prev,
          close_rate: snap.close_rate?.toString() ?? "",
        }));
      }
    })();
  }, [profile?.id]);

  const metrics = GUIDES[guide].metrics;

  const results = useMemo(() => {
    return metrics.map((m) => {
      const raw = parseFloat(values[m.key]?.replace(",", ".") || "");
      const val = isNaN(raw) ? null : raw;
      const level = val !== null ? classifyValue(m, val) : null;
      return { metric: m, val, level };
    });
  }, [metrics, values]);

  const healthScore = useMemo(() => {
    const scores = results
      .filter((r) => r.level !== null)
      .map((r) => levelToScore(r.level!.key));
    return scores.length > 0 ? scoreToPercent(scores) : null;
  }, [results]);

  const healthLabel =
    healthScore === null
      ? null
      : healthScore <= 40
        ? "Situação Crítica"
        : healthScore <= 60
          ? "Precisa Atenção"
          : healthScore <= 80
            ? "Saudável"
            : "Excelente";

  const healthBadgeColor =
    healthScore === null
      ? ""
      : healthScore <= 40
        ? "bg-red-500/20 text-red-200"
        : healthScore <= 60
          ? "bg-orange-500/20 text-orange-200"
          : healthScore <= 80
            ? "bg-blue-500/20 text-blue-200"
            : "bg-green-500/20 text-green-200";

  const fieldLabels: Record<string, string> = {
    conversion_lead_sale: "Conversão Lead → Venda (%)",
    scheduling_rate: "Taxa de Agendamento (%)",
    show_rate: "Show Rate (%)",
    close_rate: "Close Rate (%)",
    goal_achievement: "Meta Alcançada (%)",
    cash_collection: "Cash Collection (%)",
    cac_commercial: "CAC Comercial (%)",
  };

  function getBarWidth(metric: typeof metrics[0], val: number): number {
    // Find the full range of the metric for bar visualization
    const allMins = metric.levels.map((l) => l.min ?? 0);
    const allMaxes = metric.levels.map((l) => l.max ?? 100);
    const rangeMin = Math.min(...allMins);
    const rangeMax = Math.max(...allMaxes);
    const clamped = Math.min(Math.max(val, rangeMin), rangeMax);
    return ((clamped - rangeMin) / (rangeMax - rangeMin)) * 100;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tradutor de Métricas</h1>
          <p className="text-muted-foreground mt-1">
            Compare suas métricas com benchmarks do mercado e receba coaching personalizado
          </p>
        </div>

        {/* Guide selector */}
        <Tabs value={guide} onValueChange={(v) => setGuide(v as GuideKey)}>
          <TabsList>
            <TabsTrigger value="high_ticket">High Ticket Direto</TabsTrigger>
            <TabsTrigger value="diagnostic">Funil Diagnóstico</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Health Score */}
        {healthScore !== null && (
          <Card className="bg-primary text-primary-foreground border-primary">
            <CardContent className="py-8 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
                Pontuação de Saúde do Funil
              </p>
              <p className="text-6xl font-bold mt-2">{Math.round(healthScore)}%</p>
              <Badge className={`mt-3 border ${healthBadgeColor}`}>
                {healthLabel}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suas Métricas</CardTitle>
            <CardDescription>
              Insira seus valores atuais para ver a classificação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.keys(values).map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label>{fieldLabels[key]}</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="ex: 25"
                    value={values[key]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metric result cards */}
        <div className="space-y-4">
          {results.map(({ metric, val, level }) => (
            <Collapsible key={metric.key}>
              <Card>
                <CardContent className="py-5 px-5 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{metric.label}</span>
                      {val !== null && (
                        <span className="text-lg font-bold text-foreground">
                          {val}{metric.suffix}
                        </span>
                      )}
                    </div>
                    {level && (
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`border ${badgeStyles[level.color]}`}
                          variant="outline"
                        >
                          {level.label}
                        </Badge>
                        <CollapsibleTrigger className="p-1 rounded hover:bg-muted transition-colors">
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </CollapsibleTrigger>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {val !== null && level && (
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColors[level.color]}`}
                        style={{ width: `${Math.min(getBarWidth(metric, val), 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Coaching */}
                  <CollapsibleContent>
                    {level && (
                      <p className="text-sm italic text-muted-foreground mt-2 leading-relaxed">
                        {level.coaching}
                      </p>
                    )}
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
