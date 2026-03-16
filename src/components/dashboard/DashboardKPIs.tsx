import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Target, BarChart3, CalendarCheck } from "lucide-react";
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
  deals_closed: number | null;
  leads_generated: number | null;
  meetings_booked: number | null;
  proposals_sent: number | null;
  qualification_rate: number | null;
  close_rate: number | null;
  avg_ticket: number | null;
  [key: string]: any;
}

export interface KpiAgg {
  leads: number;
  qualified: number;
  scheduled: number;
  completed: number;
  sales: number;
  revenue: number;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

export function DashboardKPIs({
  leads,
  snapshots,
  timePeriod,
  kpiAgg,
  prevKpiAgg,
}: {
  leads: Lead[];
  snapshots: Snapshot[];
  timePeriod?: TimePeriodState;
  kpiAgg?: KpiAgg;
  prevKpiAgg?: KpiAgg;
}) {
  const stats = useMemo(() => {
    // Prefer seller KPI data when available
    const hasKpiData = kpiAgg && (kpiAgg.leads > 0 || kpiAgg.sales > 0 || kpiAgg.revenue > 0);

    const leadsGenerated = hasKpiData ? kpiAgg.leads : 0;
    const leadsQualified = hasKpiData ? kpiAgg.qualified : 0;
    const meetingsScheduled = hasKpiData ? kpiAgg.scheduled : 0;
    const meetingsCompleted = hasKpiData ? kpiAgg.completed : 0;
    const sales = hasKpiData ? kpiAgg.sales : 0;
    const revenue = hasKpiData ? kpiAgg.revenue : 0;

    const conversionRate = leadsGenerated > 0 ? (sales / leadsGenerated) * 100 : 0;
    const showRate = meetingsScheduled > 0 ? (meetingsCompleted / meetingsScheduled) * 100 : 0;
    const avgTicket = sales > 0 ? revenue / sales : 0;

    // Forecast from leads in proposal stage
    const forecast = leads
      .filter((l) => l.stage === "proposal")
      .reduce((s, l) => s + (l.proposal_value || 0), 0);

    // Previous period from KPI aggregation
    const prevHasData = prevKpiAgg && (prevKpiAgg.leads > 0 || prevKpiAgg.sales > 0);
    const prevRevenue = prevHasData ? prevKpiAgg.revenue : null;
    const prevLeads = prevHasData ? prevKpiAgg.leads : null;
    const prevConversion =
      prevHasData && prevKpiAgg.leads > 0
        ? (prevKpiAgg.sales / prevKpiAgg.leads) * 100
        : null;
    const prevShowRate =
      prevHasData && prevKpiAgg.scheduled > 0
        ? (prevKpiAgg.completed / prevKpiAgg.scheduled) * 100
        : null;
    const prevSales = prevHasData ? prevKpiAgg.sales : null;

    return {
      leadsGenerated,
      leadsQualified,
      meetingsScheduled,
      meetingsCompleted,
      sales,
      revenue,
      conversionRate,
      showRate,
      avgTicket,
      forecast,
      prevRevenue,
      prevLeads,
      prevConversion,
      prevShowRate,
      prevSales,
    };
  }, [leads, kpiAgg, prevKpiAgg]);

  const isMonthly = !timePeriod || timePeriod.periodType === "monthly";

  const kpis = [
    {
      label: "Leads Gerados",
      value: String(stats.leadsGenerated),
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      mom: {
        current: stats.leadsGenerated,
        previous: stats.prevLeads,
        format: (v: number) => String(v),
      },
    },
    {
      label: "Vendas",
      value: String(stats.sales),
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      sub: `Ticket Médio: ${formatBRL(stats.avgTicket)}`,
      mom: {
        current: stats.sales,
        previous: stats.prevSales,
        format: (v: number) => String(v),
      },
    },
    {
      label: isMonthly ? "Receita do Mês" : "Receita do Período",
      value: formatBRL(stats.revenue),
      icon: DollarSign,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      mom: {
        current: stats.revenue,
        previous: stats.prevRevenue,
        format: formatBRL,
      },
    },
    {
      label: "Taxa de Conversão",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: Target,
      iconBg: stats.conversionRate >= 20 ? "bg-success/10" : "bg-accent/10",
      iconColor: stats.conversionRate >= 20 ? "text-success" : "text-accent",
      mom: {
        current: stats.conversionRate,
        previous: stats.prevConversion,
        format: (v: number) => `${v.toFixed(1)}%`,
      },
    },
    {
      label: "Show Rate",
      value: `${stats.showRate.toFixed(1)}%`,
      icon: CalendarCheck,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      sub: `${stats.meetingsCompleted}/${stats.meetingsScheduled} reuniões`,
      mom: {
        current: stats.showRate,
        previous: stats.prevShowRate,
        format: (v: number) => `${v.toFixed(1)}%`,
      },
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.iconBg}`}
              >
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            {kpi.sub && (
              <p className="mt-1 text-[11px] text-muted-foreground">{kpi.sub}</p>
            )}
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
