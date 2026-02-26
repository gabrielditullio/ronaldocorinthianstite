import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, TrendingDown, DollarSign, Target, BarChart3 } from "lucide-react";

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
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardKPIs({ leads, snapshots }: { leads: Lead[]; snapshots: Snapshot[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthStr = monthStart.toISOString();

    const totalActive = leads.filter((l) => !l.stage.startsWith("closed")).length;

    const thisMonthLeads = leads.filter((l) => l.created_at && l.created_at >= thisMonthStr);
    const closedWonThisMonth = leads.filter(
      (l) => l.stage === "closed_won" && l.stage_changed_at && l.stage_changed_at >= thisMonthStr
    );
    const conversionRate = thisMonthLeads.length > 0
      ? (closedWonThisMonth.length / thisMonthLeads.length) * 100
      : 0;

    const revenueThisMonth = closedWonThisMonth.reduce((s, l) => s + (l.proposal_value || 0), 0);
    const target = 100000;
    const goalPercent = target > 0 ? (revenueThisMonth / target) * 100 : 0;
    const forecast = leads
      .filter((l) => l.stage === "proposal")
      .reduce((s, l) => s + (l.proposal_value || 0), 0);

    // Prev month from snapshots
    const prevSnap = snapshots.find((s) => s.month_year === prevMonthKey());
    const prevRevenue = prevSnap?.total_revenue ?? null;
    const prevDeals = prevSnap?.deals_closed ?? null;

    return { totalActive, conversionRate, revenueThisMonth, goalPercent, forecast, prevRevenue, prevDeals, target };
  }, [leads, snapshots]);

  const kpis = [
    {
      label: "Leads Ativos",
      value: String(stats.totalActive),
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Taxa de Conversão",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      alert: stats.conversionRate < 20,
    },
    {
      label: "Receita do Mês",
      value: formatBRL(stats.revenueThisMonth),
      icon: DollarSign,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      sub: stats.prevRevenue != null
        ? `Mês anterior: ${formatBRL(stats.prevRevenue)}`
        : undefined,
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
