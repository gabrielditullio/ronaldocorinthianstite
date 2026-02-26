import { useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, Minus, Camera, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatBRL(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v: number | null): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

type Snapshot = {
  id: string;
  month_year: string;
  leads_generated: number | null;
  qualification_rate: number | null;
  meetings_booked: number | null;
  proposals_sent: number | null;
  close_rate: number | null;
  deals_closed: number | null;
  total_revenue: number | null;
  avg_ticket: number | null;
  cac: number | null;
  ltv_cac_ratio: number | null;
};

const METRIC_ROWS: {
  key: keyof Snapshot;
  label: string;
  format: (v: any) => string;
  higherIsBetter: boolean;
}[] = [
  { key: "leads_generated", label: "Leads Gerados", format: (v) => v?.toString() ?? "—", higherIsBetter: true },
  { key: "qualification_rate", label: "Taxa Qualificação", format: pct, higherIsBetter: true },
  { key: "meetings_booked", label: "Meetings", format: (v) => v?.toString() ?? "—", higherIsBetter: true },
  { key: "proposals_sent", label: "Propostas", format: (v) => v?.toString() ?? "—", higherIsBetter: true },
  { key: "close_rate", label: "Taxa Fechamento", format: pct, higherIsBetter: true },
  { key: "deals_closed", label: "Deals Fechados", format: (v) => v?.toString() ?? "—", higherIsBetter: true },
  { key: "total_revenue", label: "Revenue", format: formatBRL, higherIsBetter: true },
  { key: "avg_ticket", label: "Ticket Médio", format: formatBRL, higherIsBetter: true },
  { key: "cac", label: "CAC", format: formatBRL, higherIsBetter: false },
  { key: "ltv_cac_ratio", label: "LTV/CAC", format: (v) => v != null ? `${Number(v).toFixed(1)}x` : "—", higherIsBetter: true },
];

function TrendIcon({ current, previous, higherIsBetter }: { current: number | null; previous: number | null; higherIsBetter: boolean }) {
  if (current == null || previous == null || previous === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const change = (current - previous) / Math.abs(previous);
  if (Math.abs(change) < 0.02) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const isUp = change > 0;
  const isGood = higherIsBetter ? isUp : !isUp;
  if (isGood) return <ArrowUp className="h-4 w-4 text-green-600" />;
  return <ArrowDown className="h-4 w-4 text-red-500" />;
}

export default function MonthlyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: snapshots = [] } = useQuery({
    queryKey: ["monthly_snapshots", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .eq("user_id", user!.id)
        .order("month_year", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads_for_snapshot", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const monthStart = new Date(currentMonth + "-01");
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const monthLeads = leads.filter((l) => {
        const d = new Date(l.created_at ?? "");
        return d >= monthStart && d < nextMonth;
      });

      const total = monthLeads.length;
      const pastLead = monthLeads.filter((l) => l.stage !== "lead").length;
      const meetingsPlus = monthLeads.filter((l) =>
        ["meeting", "proposal", "closed_won", "closed_lost"].includes(l.stage)
      ).length;
      const proposalsPlus = monthLeads.filter((l) =>
        ["proposal", "closed_won", "closed_lost"].includes(l.stage)
      ).length;
      const closedWon = monthLeads.filter((l) => l.stage === "closed_won").length;
      const revenue = monthLeads
        .filter((l) => l.stage === "closed_won")
        .reduce((s, l) => s + (l.proposal_value ?? 0), 0);
      const avgTicket = closedWon > 0 ? revenue / closedWon : 0;
      const qualRate = total > 0 ? pastLead / total : 0;
      const closeRate = total > 0 ? closedWon / total : 0;

      // Pull CAC from latest cac_calculation
      const { data: cacData } = await supabase
        .from("cac_calculations")
        .select("cac")
        .eq("user_id", user.id)
        .order("month_year", { ascending: false })
        .limit(1);
      const cac = cacData?.[0]?.cac ?? null;
      const ltvCac = cac && cac > 0 ? (avgTicket * 12) / cac : null;

      const row = {
        user_id: user.id,
        month_year: currentMonth,
        leads_generated: total,
        qualification_rate: qualRate,
        meetings_booked: meetingsPlus,
        proposals_sent: proposalsPlus,
        close_rate: closeRate,
        deals_closed: closedWon,
        total_revenue: revenue,
        avg_ticket: avgTicket,
        cac,
        ltv_cac_ratio: ltvCac,
      };

      const existing = snapshots.find((s) => s.month_year === currentMonth);
      if (existing) {
        const { error } = await supabase
          .from("monthly_snapshots")
          .update(row)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("monthly_snapshots")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_snapshots"] });
      toast({ title: "Snapshot gerado!", description: `Dados de ${currentMonth} salvos.` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const last6 = useMemo(() => snapshots.slice(-6), [snapshots]);

  const monthLabel = (my: string) => {
    const [y, m] = my.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
  };

  const revenueChartConfig = { total_revenue: { label: "Revenue", color: "hsl(var(--primary))" } };
  const funnelChartConfig = {
    leads_generated: { label: "Leads", color: "hsl(213, 85%, 31%)" },
    meetings_booked: { label: "Meetings", color: "hsl(195, 60%, 45%)" },
    proposals_sent: { label: "Propostas", color: "hsl(36, 90%, 51%)" },
    deals_closed: { label: "Deals", color: "hsl(145, 55%, 40%)" },
  };
  const closeRateConfig = { close_rate: { label: "Taxa Fech.", color: "hsl(var(--primary))" } };

  const chartData = last6.map((s) => ({
    month: monthLabel(s.month_year),
    total_revenue: s.total_revenue ?? 0,
    leads_generated: s.leads_generated ?? 0,
    meetings_booked: s.meetings_booked ?? 0,
    proposals_sent: s.proposals_sent ?? 0,
    deals_closed: s.deals_closed ?? 0,
    close_rate: ((s.close_rate ?? 0) * 100),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comparativo Mensal</h1>
            <p className="text-muted-foreground">Evolução mês a mês dos indicadores-chave</p>
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <Camera className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? "Gerando..." : "Gerar Snapshot do Mês"}
          </Button>
        </div>

        {last6.length < 2 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">Continue alimentando o Funil de Vendas</p>
              <p className="text-muted-foreground mt-1">
                Com 2+ meses de dados, você verá tendências aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Métricas por Mês</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Métrica</TableHead>
                      {last6.map((s) => (
                        <TableHead key={s.month_year} className="text-center min-w-[90px]">
                          {monthLabel(s.month_year)}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {METRIC_ROWS.map((mr) => (
                      <TableRow key={mr.key}>
                        <TableCell className="font-medium">{mr.label}</TableCell>
                        {last6.map((s) => (
                          <TableCell key={s.month_year} className="text-center">
                            {mr.format(s[mr.key])}
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <TrendIcon
                              current={last6[last6.length - 1]?.[mr.key] as number | null}
                              previous={last6[last6.length - 2]?.[mr.key] as number | null}
                              higherIsBetter={mr.higherIsBetter}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Evolução de Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="total_revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progressão do Funil</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={funnelChartConfig} className="h-[250px] w-full">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="leads_generated" stroke="hsl(213, 85%, 31%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="meetings_booked" stroke="hsl(195, 60%, 45%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="proposals_sent" stroke="hsl(36, 90%, 51%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="deals_closed" stroke="hsl(145, 55%, 40%)" strokeWidth={2} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Taxa de Fechamento por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={closeRateConfig} className="h-[250px] w-full">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${v}%`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="close_rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
