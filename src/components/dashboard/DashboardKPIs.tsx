import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Target, BarChart3 } from "lucide-react";
import { MoMIndicator } from "@/components/MoMIndicator";
import { TimePeriodState } from "@/contexts/TimePeriodContext";
import { filterSnapshotsByRange, aggregateSnapshots } from "@/lib/period-aggregation";

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
  deals_closed: number | null;
  leads_generated: number | null;
  meetings_booked: number | null;
  proposals_sent: number | null;
  qualification_rate: number | null;
  close_rate: number | null;
  avg_ticket: number | null;
  [key: string]: any;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

export function DashboardKPIs({ leads, snapshots, timePeriod }: { leads: Lead[]; snapshots: Snapshot[]; timePeriod?: TimePeriodState }) {
  const stats = useMemo(() => {
    const startDate = timePeriod?.startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = timePeriod?.endDate ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const startIso = startDate.toISOString();
    const endIso = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).toISOString();

    const totalActive = leads.filter((l) => !l.stage.startsWith("closed")).length;

    const periodLeads = leads.filter((l) => l.created_at && l.created_at >= startIso && l.created_at <= endIso);
    const closedWonPeriod = leads.filter(
      (l) => l.stage === "closed_won" && l.stage_changed_at && l.stage_changed_at >= startIso && l.stage_changed_at <= endIso
    );
    const conversionRate = periodLeads.length > 0
      ? (closedWonPeriod.length / periodLeads.length) * 100
      : 0;

    const revenueThisPeriod = closedWonPeriod.reduce((s, l) => s + (l.proposal_value || 0), 0);

    // Use snapshot aggregation for period data
    const periodSnaps = filterSnapshotsByRange(snapshots, startDate, endDate);
    const agg = aggregateSnapshots(periodSnaps);

    const target = 100000;
    const effectiveRevenue = agg.totalRevenue > 0 ? agg.totalRevenue : revenueThisPeriod;
    const goalPercent = target > 0 ? (effectiveRevenue / target) * 100 : 0;
    const forecast = leads
      .filter((l) => l.stage === "proposal")
      .reduce((s, l) => s + (l.proposal_value || 0), 0);

    // Previous period comparison
    let prevRevenue: number | null = null;
    let prevLeads: number | null = null;
    let prevConversion: number | null = null;

    if (timePeriod?.compareEnabled && timePeriod.prevStartDate && timePeriod.prevEndDate) {
      const prevSnaps = filterSnapshotsByRange(snapshots, timePeriod.prevStartDate, timePeriod.prevEndDate);
      const prevAgg = aggregateSnapshots(prevSnaps);
      prevRevenue = prevAgg.totalRevenue;
      prevLeads = prevAgg.leadsGenerated;
      prevConversion = prevAgg.conversionRate;
    } else {
      // Default: compare with previous period equivalent (monthly fallback)
      const prevStart = new Date(startDate);
      prevStart.setMonth(prevStart.getMonth() - 1);
      const prevEnd = new Date(endDate);
      prevEnd.setMonth(prevEnd.getMonth() - 1);
      const prevSnaps = filterSnapshotsByRange(snapshots, prevStart, prevEnd);
      if (prevSnaps.length > 0) {
        const prevAgg = aggregateSnapshots(prevSnaps);
        prevRevenue = prevAgg.totalRevenue;
        prevLeads = prevAgg.leadsGenerated;
        prevConversion = prevAgg.conversionRate;
      }
    }

    return {
      totalActive, conversionRate,
      revenueThisPeriod: effectiveRevenue,
      goalPercent, forecast, target,
      prevRevenue, prevLeads, prevConversion,
    };
  }, [leads, snapshots, timePeriod]);

  const isMonthly = !timePeriod || timePeriod.periodType === "monthly";

  const kpis = [
    {
      label: "Leads Ativos",
      value: String(stats.totalActive),
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      mom: { current: stats.totalActive, previous: stats.prevLeads, format: (v: number) => String(v) },
    },
    {
      label: "Taxa de Conversão",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      alert: stats.conversionRate < 20,
      mom: { current: stats.conversionRate, previous: stats.prevConversion, format: (v: number) => `${v.toFixed(1)}%` },
    },
    {
      label: isMonthly ? "Receita do Mês" : "Receita do Período",
      value: formatBRL(stats.revenueThisPeriod),
      icon: DollarSign,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      mom: { current: stats.revenueThisPeriod, previous: stats.prevRevenue, format: formatBRL },
    },
    {
      label: "Meta Atingida",
      value: `${Math.min(stats.goalPercent, 100).toFixed(0)}%`,
      icon: Target,
      iconBg: stats.goalPercent >= 100 ? "bg-success/10" : "bg-accent/10",
      iconColor: stats.goalPercent >= 100 ? "text-success" : "text-accent",
      sub: `Meta: ${formatBRL(stats.target)}`,
    },
    {
      label: "Forecast",
      value: formatBRL(stats.forecast),
      icon: BarChart3,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      sub: "Propostas em aberto",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            {(kpi as any).mom && (
              <div className="mt-1.5">
                <MoMIndicator
                  current={(kpi as any).mom.current}
                  previous={(kpi as any).mom.previous}
                  format={(kpi as any).mom.format}
                  periodLabel={isMonthly ? undefined : "Período anterior"}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
