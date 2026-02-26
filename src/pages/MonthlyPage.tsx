import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, Minus, Camera, TrendingUp, Save } from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
  total_received: number | null;
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
  { key: "total_received", label: "Cash Collection", format: (v) => v != null ? formatBRL(v) : "—", higherIsBetter: true },
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
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

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
      return (data ?? []).map((d: any) => ({ ...d, total_received: d.total_received ?? 0 })) as Snapshot[];
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

  // Cash collection form fields for current month
  const [totalBilled, setTotalBilled] = useState("");
  const [totalReceived, setTotalReceived] = useState("");

  // Pre-fill from current month snapshot
  const currentSnap = snapshots.find((s) => s.month_year === currentMonth);
  const cashRate = useMemo(() => {
    const billed = parseFloat(totalBilled) || currentSnap?.total_revenue || 0;
    const received = parseFloat(totalReceived) || currentSnap?.total_received || 0;
    return billed > 0 ? (received / billed) * 100 : 0;
  }, [totalBilled, totalReceived, currentSnap]);

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

      const receivedVal = parseFloat(totalReceived) || 0;

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
        total_received: receivedVal,
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

        {/* Cash Collection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💰 Cash Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Total Faturado (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="ex: 100000"
                  value={totalBilled}
                  onChange={(e) => setTotalBilled(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Recebido (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="ex: 85000"
                  value={totalReceived}
                  onChange={(e) => setTotalReceived(e.target.value)}
                />
              </div>
            </div>
            {cashRate > 0 && (() => {
              const level = cashRate <= 50 ? { label: "Péssimo", badgeCls: "bg-red-50 text-red-600 border-red-200", barCls: "bg-red-500" }
                : cashRate <= 70 ? { label: "Ruim", badgeCls: "bg-orange-50 text-orange-600 border-orange-200", barCls: "bg-orange-500" }
                : cashRate <= 85 ? { label: "Bom", badgeCls: "bg-blue-50 text-blue-600 border-blue-200", barCls: "bg-blue-500" }
                : cashRate <= 95 ? { label: "Ótimo", badgeCls: "bg-emerald-50 text-emerald-600 border-emerald-200", barCls: "bg-emerald-500" }
                : { label: "Excelente", badgeCls: "bg-green-50 text-green-600 border-green-200", barCls: "bg-green-500" };
              const billed = parseFloat(totalBilled) || currentSnap?.total_revenue || 0;
              const received = parseFloat(totalReceived) || currentSnap?.total_received || 0;
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-foreground">{cashRate.toFixed(1)}%</span>
                    <Badge variant="outline" className={`border ${level.badgeCls}`}>{level.label}</Badge>
                  </div>
                  <Progress value={Math.min(cashRate, 100)} className="h-2.5" />
                  <p className="text-sm text-muted-foreground">
                    {formatBRL(received)} de {formatBRL(billed)} recebidos
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

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

            {/* Channel Revenue Section */}
            <ChannelRevenueSection userId={user?.id} month={currentMonthNum} year={currentYear} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

const DONUT_COLORS = [
  "hsl(340, 50%, 35%)", "hsl(213, 85%, 31%)", "hsl(36, 90%, 51%)",
  "hsl(145, 55%, 40%)", "hsl(195, 60%, 45%)", "hsl(280, 50%, 45%)", "hsl(15, 70%, 50%)",
];

function ChannelRevenueSection({ userId, month, year }: { userId?: string; month: number; year: number }) {
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [channelData, setChannelData] = useState<Record<string, { target: number; actual: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("sales_channels").select("id, name").eq("user_id", userId).eq("is_active", true).order("created_at")
      .then(({ data }) => { if (data) setChannels(data); });
  }, [userId]);

  useEffect(() => {
    if (!userId || channels.length === 0) return;
    supabase.from("channel_monthly_data").select("*").eq("user_id", userId).eq("month", month).eq("year", year)
      .then(({ data }) => {
        const map: Record<string, { target: number; actual: number }> = {};
        channels.forEach(ch => { map[ch.id] = { target: 0, actual: 0 }; });
        data?.forEach((r: any) => { map[r.channel_id] = { target: Number(r.target) || 0, actual: Number(r.actual) || 0 }; });
        setChannelData(map);
      });
  }, [userId, channels, month, year]);

  const updateField = (chId: string, field: "target" | "actual", val: number) => {
    setChannelData(prev => ({ ...prev, [chId]: { ...prev[chId], [field]: val } }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const records = channels.map(ch => ({
      user_id: userId,
      channel_id: ch.id,
      month,
      year,
      target: channelData[ch.id]?.target || 0,
      actual: channelData[ch.id]?.actual || 0,
    }));
    const { error } = await supabase.from("channel_monthly_data").upsert(records, { onConflict: "channel_id,month,year" });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Dados de canais salvos!" });
    setSaving(false);
  };

  const totalTarget = Object.values(channelData).reduce((s, v) => s + v.target, 0);
  const totalActual = Object.values(channelData).reduce((s, v) => s + v.actual, 0);

  const donutData = channels.map(ch => ({ name: ch.name, value: channelData[ch.id]?.actual || 0 })).filter(d => d.value > 0);

  if (channels.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Faturamento por Canal</CardTitle>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#5B2333] hover:bg-[#5B2333]/90 text-white">
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#5B2333] hover:bg-[#5B2333]">
                <TableHead className="text-white font-semibold">Canal</TableHead>
                <TableHead className="text-white font-semibold text-center">Meta (R$)</TableHead>
                <TableHead className="text-white font-semibold text-center">Realizado (R$)</TableHead>
                <TableHead className="text-white font-semibold text-center">% Atingimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((ch, i) => {
                const d = channelData[ch.id] || { target: 0, actual: 0 };
                const pctVal = d.target > 0 ? (d.actual / d.target) * 100 : 0;
                const badgeCls = pctVal < 60 ? "bg-red-50 text-red-600 border-red-200"
                  : pctVal < 90 ? "bg-orange-50 text-orange-600 border-orange-200"
                  : "bg-green-50 text-green-600 border-green-200";
                return (
                  <TableRow key={ch.id} className={i % 2 === 0 ? "bg-[#FAF6F0]" : "bg-white"}>
                    <TableCell className="font-medium">{ch.name}</TableCell>
                    <TableCell className="p-1"><Input type="number" min={0} className="h-8 text-center text-sm" value={d.target || ""} onChange={e => updateField(ch.id, "target", Number(e.target.value) || 0)} /></TableCell>
                    <TableCell className="p-1"><Input type="number" min={0} className="h-8 text-center text-sm" value={d.actual || ""} onChange={e => updateField(ch.id, "actual", Number(e.target.value) || 0)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(pctVal, 100)} className="h-2 flex-1" />
                        <Badge variant="outline" className={`text-xs border ${badgeCls}`}>{pctVal.toFixed(0)}%</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">R$ {totalTarget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-center">R$ {totalActual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-center">{totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(0) : 0}%</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Receita por Canal</CardTitle></CardHeader>
        <CardContent className="flex justify-center">
          {donutData.length > 0 ? (
            <PieChart width={250} height={250}>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {donutData.map((_, idx) => <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            </PieChart>
          ) : (
            <p className="text-muted-foreground text-sm py-12">Preencha os valores realizados para ver o gráfico.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
