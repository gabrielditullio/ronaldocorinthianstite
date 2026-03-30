import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, DollarSign, Target, CalendarCheck, BarChart3, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { MoMIndicator } from "@/components/MoMIndicator";
import { TimePeriodState } from "@/contexts/TimePeriodContext";

interface Lead {
  id: string;
  stage: string;
  proposal_value: number | null;
  stage_changed_at: string | null;
  created_at: string | null;
}

interface Snapshot {
  month_year: string;
  total_revenue: number | null;
  [key: string]: any;
}

export interface KpiAgg {
  leads: number;
  qualified: number;
  scheduled: number;
  completed: number;
  sales: number;
  revenue: number;
  net_revenue: number;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function variationPct(current: number, previous: number | null): { pct: number; isPositive: boolean } | null {
  if (previous == null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { pct, isPositive: pct > 0 };
}

export function DashboardKPIs({
  leads,
  snapshots,
  timePeriod,
  kpiAgg,
  prevKpiAgg,
  compareEnabled = false,
}: {
  leads: Lead[];
  snapshots: Snapshot[];
  timePeriod?: TimePeriodState;
  kpiAgg?: KpiAgg;
  prevKpiAgg?: KpiAgg;
  compareEnabled?: boolean;
}) {
  const stats = useMemo(() => {
    const hasKpiData = kpiAgg && (kpiAgg.leads > 0 || kpiAgg.sales > 0 || kpiAgg.revenue > 0);

    const leadsGenerated = hasKpiData ? kpiAgg.leads : 0;
    const meetingsScheduled = hasKpiData ? kpiAgg.scheduled : 0;
    const meetingsCompleted = hasKpiData ? kpiAgg.completed : 0;
    const sales = hasKpiData ? kpiAgg.sales : 0;
    const revenue = hasKpiData ? kpiAgg.revenue : 0;
    const netRevenue = hasKpiData ? kpiAgg.net_revenue : 0;

    const conversionRate = leadsGenerated > 0 ? (sales / leadsGenerated) * 100 : 0;
    const showRate = meetingsScheduled > 0 ? (meetingsCompleted / meetingsScheduled) * 100 : 0;
    const avgTicket = sales > 0 ? revenue / sales : 0;

    const prevHasData = prevKpiAgg && (prevKpiAgg.leads > 0 || prevKpiAgg.sales > 0);
    const prevRevenue = prevHasData ? prevKpiAgg.revenue : null;
    const prevNetRevenue = prevHasData ? prevKpiAgg.net_revenue : null;
    const prevLeads = prevHasData ? prevKpiAgg.leads : null;
    const prevConversion = prevHasData && prevKpiAgg.leads > 0 ? (prevKpiAgg.sales / prevKpiAgg.leads) * 100 : null;
    const prevShowRate = prevHasData && prevKpiAgg.scheduled > 0 ? (prevKpiAgg.completed / prevKpiAgg.scheduled) * 100 : null;
    const prevSales = prevHasData ? prevKpiAgg.sales : null;
    const prevQualified = prevHasData ? prevKpiAgg.qualified : null;
    const prevScheduled = prevHasData ? prevKpiAgg.scheduled : null;
    const prevCompleted = prevHasData ? prevKpiAgg.completed : null;

    return { leadsGenerated, meetingsScheduled, meetingsCompleted, sales, revenue, netRevenue, conversionRate, showRate, avgTicket, prevRevenue, prevNetRevenue, prevLeads, prevConversion, prevShowRate, prevSales, prevQualified, prevScheduled, prevCompleted };
  }, [kpiAgg, prevKpiAgg]);

  const isMonthly = !timePeriod || timePeriod.periodType === "monthly";

  const kpis = [
    {
      label: "Leads Gerados",
      value: String(stats.leadsGenerated),
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      mom: { current: stats.leadsGenerated, previous: stats.prevLeads, format: (v: number) => String(v) },
    },
    {
      label: "Vendas",
      value: String(stats.sales),
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      sub: `Ticket Médio: ${formatBRL(stats.avgTicket)}`,
      mom: { current: stats.sales, previous: stats.prevSales, format: (v: number) => String(v) },
    },
    {
      label: isMonthly ? "Faturamento do Mês" : "Faturamento do Período",
      value: formatBRL(stats.revenue),
      icon: DollarSign,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      mom: { current: stats.revenue, previous: stats.prevRevenue, format: formatBRL },
    },
    {
      label: isMonthly ? "Receita do Mês" : "Receita do Período",
      value: formatBRL(stats.netRevenue),
      icon: BarChart3,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      sub: "Valor efetivamente recebido",
      mom: { current: stats.netRevenue, previous: stats.prevNetRevenue, format: formatBRL },
    },
    {
      label: "Taxa de Conversão",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: Target,
      iconBg: stats.conversionRate >= 20 ? "bg-success/10" : "bg-accent/10",
      iconColor: stats.conversionRate >= 20 ? "text-success" : "text-accent",
      mom: { current: stats.conversionRate, previous: stats.prevConversion, format: (v: number) => `${v.toFixed(1)}%` },
    },
    {
      label: "Taxa de Presença",
      value: `${stats.showRate.toFixed(1)}%`,
      icon: CalendarCheck,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      sub: `${stats.meetingsCompleted}/${stats.meetingsScheduled} reuniões`,
      mom: { current: stats.showRate, previous: stats.prevShowRate, format: (v: number) => `${v.toFixed(1)}%` },
    },
  ];

  // Comparison table rows
  const comparisonRows = compareEnabled ? [
    { label: "Leads", current: stats.leadsGenerated, previous: stats.prevLeads, format: (v: number) => String(v) },
    { label: "Qualificados", current: kpiAgg?.qualified ?? 0, previous: stats.prevQualified, format: (v: number) => String(v) },
    { label: "Agendadas", current: stats.meetingsScheduled, previous: stats.prevScheduled, format: (v: number) => String(v) },
    { label: "Realizadas", current: stats.meetingsCompleted, previous: stats.prevCompleted, format: (v: number) => String(v) },
    { label: "Vendas", current: stats.sales, previous: stats.prevSales, format: (v: number) => String(v) },
    { label: "Faturamento", current: stats.revenue, previous: stats.prevRevenue, format: formatBRL },
    { label: "Receita", current: stats.netRevenue, previous: stats.prevNetRevenue, format: formatBRL },
    { label: "Conversão", current: stats.conversionRate, previous: stats.prevConversion, format: (v: number) => `${v.toFixed(1)}%` },
    { label: "Taxa de Presença", current: stats.showRate, previous: stats.prevShowRate, format: (v: number) => `${v.toFixed(1)}%` },
  ] : [];

  const fmtDate = (d: Date | null) => {
    if (!d) return "";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              {kpi.sub && <p className="mt-1 text-[11px] text-muted-foreground">{kpi.sub}</p>}
              {compareEnabled && kpi.mom && (
                <div className="mt-1.5">
                  <MoMIndicator
                    current={kpi.mom.current}
                    previous={kpi.mom.previous}
                    format={kpi.mom.format}
                    periodLabel={isMonthly ? undefined : "Período anterior"}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {compareEnabled && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              📊 Comparação: Período anterior ({fmtDate(timePeriod?.prevStartDate ?? null)} a {fmtDate(timePeriod?.prevEndDate ?? null)})
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Métrica</TableHead>
                    <TableHead className="text-center">Atual</TableHead>
                    <TableHead className="text-center">Anterior</TableHead>
                    <TableHead className="text-center">Variação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.map((row) => {
                    const v = variationPct(row.current, row.previous ?? null);
                    return (
                      <TableRow key={row.label}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className="text-center">{row.format(row.current)}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {row.previous != null ? row.format(row.previous) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {v ? (
                            <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${Math.abs(v.pct) < 0.5 ? "text-muted-foreground" : v.isPositive ? "text-green-600" : "text-red-500"}`}>
                              {Math.abs(v.pct) < 0.5 ? <Minus className="h-3 w-3" /> : v.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {v.isPositive ? "+" : ""}{v.pct.toFixed(1)}%
                            </span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
