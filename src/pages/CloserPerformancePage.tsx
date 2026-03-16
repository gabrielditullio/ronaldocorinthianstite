import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimePeriod, toLocalDateString } from "@/contexts/TimePeriodContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TimePeriodSelector } from "@/components/TimePeriodSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Users, DollarSign, TrendingUp, UserPlus } from "lucide-react";
import { MoMIndicator } from "@/components/MoMIndicator";
import { Link } from "react-router-dom";

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
}

interface CloserMetrics {
  id: string;
  name: string;
  meetingsCompleted: number;
  sales: number;
  revenue: number;
  netRevenue: number;
  closeRate: number;
  avgTicket: number;
  goal: number;
  goalPct: number;
}

export default function CloserPerformancePage() {
  const { user } = useAuth();
  const timePeriod = useTimePeriod();
  const startDateStr = toLocalDateString(timePeriod.startDate);
  const endDateStr = toLocalDateString(timePeriod.endDate);

  const diffMs = timePeriod.endDate.getTime() - timePeriod.startDate.getTime();
  const prevEnd = new Date(timePeriod.startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diffMs);
  const prevStartStr = toLocalDateString(prevStart);
  const prevEndStr = toLocalDateString(prevEnd);

  const { data: closers = [], isLoading: loadingClosers } = useQuery({
    queryKey: ["closer-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("id, name, monthly_revenue_goal").eq("role", "closer").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: kpis = [], isLoading: loadingKpis } = useQuery({
    queryKey: ["closer-kpis", startDateStr, endDateStr],
    queryFn: async () => {
      const closerIds = closers.map(c => c.id);
      if (closerIds.length === 0) return [];
      const { data, error } = await supabase.from("daily_seller_kpis").select("*").in("team_member_id", closerIds).gte("date", startDateStr).lte("date", endDateStr);
      if (error) throw error;
      return data;
    },
    enabled: !!user && closers.length > 0,
  });

  const { data: prevKpis = [] } = useQuery({
    queryKey: ["closer-kpis-prev", prevStartStr, prevEndStr],
    queryFn: async () => {
      const closerIds = closers.map(c => c.id);
      if (closerIds.length === 0) return [];
      const { data, error } = await supabase.from("daily_seller_kpis").select("*").in("team_member_id", closerIds).gte("date", prevStartStr).lte("date", prevEndStr);
      if (error) throw error;
      return data;
    },
    enabled: !!user && closers.length > 0,
  });

  const metrics: CloserMetrics[] = useMemo(() => {
    return closers.map((c) => {
      const cKpis = kpis.filter((k) => k.team_member_id === c.id);
      const meetingsCompleted = cKpis.reduce((s, k) => s + (k.meetings_completed ?? 0), 0);
      const sales = cKpis.reduce((s, k) => s + (k.sales ?? 0), 0);
      const revenue = cKpis.reduce((s, k) => s + (Number(k.revenue) || 0), 0);
      const netRevenue = cKpis.reduce((s, k) => s + (Number(k.net_revenue) || 0), 0);
      const closeRate = meetingsCompleted > 0 ? (sales / meetingsCompleted) * 100 : 0;
      const avgTicket = sales > 0 ? revenue / sales : 0;
      const goal = Number(c.monthly_revenue_goal) || 100000;
      const goalPct = goal > 0 ? (revenue / goal) * 100 : 0;

      return { id: c.id, name: c.name, meetingsCompleted, sales, revenue, netRevenue, closeRate, avgTicket, goal, goalPct };
    });
  }, [closers, kpis]);

  const prevAgg = useMemo(() => {
    const agg = { meetingsCompleted: 0, sales: 0, revenue: 0, netRevenue: 0 };
    prevKpis.forEach((k) => {
      agg.meetingsCompleted += k.meetings_completed ?? 0;
      agg.sales += k.sales ?? 0;
      agg.revenue += Number(k.revenue) || 0;
      agg.netRevenue += Number(k.net_revenue) || 0;
    });
    return agg;
  }, [prevKpis]);

  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);
  const totalNetRevenue = metrics.reduce((s, m) => s + m.netRevenue, 0);
  const totalSales = metrics.reduce((s, m) => s + m.sales, 0);
  const totalMeetings = metrics.reduce((s, m) => s + m.meetingsCompleted, 0);
  const avgCloseRate = totalMeetings > 0 ? (totalSales / totalMeetings) * 100 : 0;
  const loading = loadingClosers || loadingKpis;

  const closeRateBadge = (rate: number) => {
    if (rate >= 65) return <Badge className="bg-success text-success-foreground">{rate.toFixed(0)}%</Badge>;
    if (rate >= 50) return <Badge className="bg-warning text-warning-foreground">{rate.toFixed(0)}%</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">{rate.toFixed(0)}%</Badge>;
  };

  const revenueChartData = metrics.map((m) => ({
    name: m.name,
    revenue: m.revenue,
    meta: m.goal,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Performance Closer</h1>
            <p className="text-muted-foreground">Métricas individuais dos fechadores</p>
          </div>
          <TimePeriodSelector />
        </div>

        {loading ? (
          <div className="space-y-4 animate-fade-in">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : closers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-semibold">Nenhum Closer cadastrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione Closers na página <Link to="/team" className="text-primary underline">Meu Time</Link> para ver métricas aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{closers.length}</p>
                  <p className="text-xs text-muted-foreground">Closers Ativos</p>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div>
                <div>
                  <p className="text-2xl font-bold">{formatBRL(totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <MoMIndicator current={totalRevenue} previous={prevAgg.revenue || null} format={formatBRL} />
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10"><DollarSign className="h-5 w-5 text-accent" /></div>
                <div>
                  <p className="text-2xl font-bold">{formatBRL(totalNetRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Receita</p>
                  <MoMIndicator current={totalNetRevenue} previous={prevAgg.netRevenue || null} format={formatBRL} />
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{avgCloseRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Média Fechamento</p>
                </div>
              </CardContent></Card>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Closer</TableHead>
                      <TableHead className="text-center">Realizadas</TableHead>
                      <TableHead className="text-center">Vendas</TableHead>
                      <TableHead className="text-center">Taxa</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Faturamento</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Receita</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Ticket Médio</TableHead>
                      <TableHead className="text-center">% da Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m, i) => (
                      <TableRow key={m.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-center">{m.meetingsCompleted}</TableCell>
                        <TableCell className="text-center">{m.sales}</TableCell>
                        <TableCell className="text-center">{closeRateBadge(m.closeRate)}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{formatBRL(m.revenue)}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{formatBRL(m.netRevenue)}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{formatBRL(m.avgTicket)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(m.goalPct, 100)} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10">{m.goalPct.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Taxa de Fechamento</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, metrics.length * 40 + 40)}>
                    <BarChart data={[...metrics].sort((a, b) => b.closeRate - a.closeRate)} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 14% 90%)" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)}%`, "Fechamento"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="closeRate" fill="#0B5394" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento vs Meta</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, metrics.length * 50 + 40)}>
                    <BarChart data={revenueChartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 14% 90%)" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                      <Tooltip formatter={(v: number) => [formatBRL(v)]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend />
                      <Bar dataKey="revenue" name="Faturamento" fill="#27AE60" radius={[0, 4, 4, 0]} barSize={14} />
                      <Bar dataKey="meta" name="Meta" fill="#E0E0E0" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
