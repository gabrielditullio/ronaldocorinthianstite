import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Users, DollarSign, TrendingUp, Loader2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    opts.push({ value: key, label: `${months[d.getMonth()]}/${d.getFullYear()}` });
  }
  return opts;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
}

interface CloserMetrics {
  id: string;
  name: string;
  proposals: number;
  closedWon: number;
  closeRate: number;
  revenue: number;
  avgTicket: number;
  avgDays: number;
  score: number;
  goalPct: number;
  goal: number;
}

export default function CloserPerformancePage() {
  const { user } = useAuth();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const { data: closers = [], isLoading: loadingClosers } = useQuery({
    queryKey: ["closer-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, monthly_revenue_goal")
        .eq("role", "Closer")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [y, m] = selectedMonth.split("-").map(Number);
  const monthStart = `${selectedMonth}-01T00:00:00`;
  const nextMonth = m === 12 ? `${y + 1}-01-01T00:00:00` : `${y}-${String(m + 1).padStart(2, "0")}-01T00:00:00`;

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["closer-leads", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, assigned_to, stage, proposal_value, stage_changed_at, updated_at, created_at")
        .gte("created_at", monthStart)
        .lt("created_at", nextMonth);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const metrics: CloserMetrics[] = useMemo(() => {
    return closers.map((c) => {
      const cLeads = leads.filter((l) => l.assigned_to === c.id);
      const proposals = cLeads.filter((l) => ["proposal", "closed_won", "closed_lost"].includes(l.stage)).length;
      const closedWon = cLeads.filter((l) => l.stage === "closed_won").length;
      const closeRate = proposals > 0 ? (closedWon / proposals) * 100 : 0;
      const revenue = cLeads
        .filter((l) => l.stage === "closed_won")
        .reduce((s, l) => s + (l.proposal_value || 0), 0);
      const avgTicket = closedWon > 0 ? revenue / closedWon : 0;

      // Avg days to close
      const closedLeads = cLeads.filter((l) => l.stage === "closed_won" && l.stage_changed_at && l.updated_at);
      const avgDays = closedLeads.length > 0
        ? closedLeads.reduce((s, l) => {
            const start = new Date(l.stage_changed_at!).getTime();
            const end = new Date(l.updated_at!).getTime();
            return s + Math.max(0, Math.floor((end - start) / 86400000));
          }, 0) / closedLeads.length
        : 0;

      // Score: speed_score = max(10 - avgDays, 0) / 10 * 100
      const speedScore = Math.max(10 - avgDays, 0) / 10 * 100;
      const normRevenue = Math.min(revenue / 100000, 1) * 100;
      const score = Math.min(Math.round(((closeRate * 0.5 + normRevenue * 0.3 + speedScore * 0.2) / 100) * 10 * 10) / 10, 10);

      const goal = c.monthly_revenue_goal || 100000;
      const goalPct = goal > 0 ? (revenue / Number(goal)) * 100 : 0;

      return { id: c.id, name: c.name, proposals, closedWon, closeRate, revenue, avgTicket, avgDays: Math.round(avgDays), score, goalPct, goal: Number(goal) };
    });
  }, [closers, leads]);

  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);
  const avgCloseRate = metrics.length > 0 ? metrics.reduce((s, m) => s + m.closeRate, 0) / metrics.length : 0;
  const loading = loadingClosers || loadingLeads;

  const scoreBadge = (score: number) => {
    if (score >= 8) return <Badge className="bg-success text-success-foreground">{score.toFixed(1)}</Badge>;
    if (score >= 7) return <Badge className="bg-warning text-warning-foreground">{score.toFixed(1)}</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">{score.toFixed(1)}</Badge>;
  };

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
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              {monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
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
            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{closers.length}</p><p className="text-xs text-muted-foreground">Closers Ativos</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div>
                <div><p className="text-2xl font-bold">{formatBRL(totalRevenue)}</p><p className="text-xs text-muted-foreground">Revenue Total</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10"><TrendingUp className="h-5 w-5 text-accent" /></div>
                <div><p className="text-2xl font-bold">{avgCloseRate.toFixed(0)}%</p><p className="text-xs text-muted-foreground">Taxa Média Fechamento</p></div>
              </CardContent></Card>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Closer</TableHead>
                      <TableHead className="text-center">Propostas</TableHead>
                      <TableHead className="text-center">Fechadas</TableHead>
                      <TableHead className="text-center">Taxa</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Revenue</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Ticket Médio</TableHead>
                      <TableHead className="text-center hidden lg:table-cell">Dias Médio</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">% da Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m, i) => (
                      <TableRow key={m.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-center">{m.proposals}</TableCell>
                        <TableCell className="text-center">{m.closedWon}</TableCell>
                        <TableCell className="text-center">{closeRateBadge(m.closeRate)}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{formatBRL(m.revenue)}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{formatBRL(m.avgTicket)}</TableCell>
                        <TableCell className="text-center hidden lg:table-cell">{m.avgDays}d</TableCell>
                        <TableCell className="text-center">{scoreBadge(m.score)}</TableCell>
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
                <CardHeader className="pb-2"><CardTitle className="text-base">Revenue vs Meta</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, metrics.length * 50 + 40)}>
                    <BarChart data={revenueChartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 14% 90%)" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                      <Tooltip formatter={(v: number) => [formatBRL(v)]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#27AE60" radius={[0, 4, 4, 0]} barSize={14} />
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
