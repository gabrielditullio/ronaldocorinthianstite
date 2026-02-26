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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { Users, TrendingUp, Award, Loader2, UserPlus } from "lucide-react";
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

interface SDRMetrics {
  id: string;
  name: string;
  leadsGenerated: number;
  qualificationRate: number;
  meetings: number;
  meetingsPct: number;
  revenue: number;
  score: number;
  goalPct: number;
  goal: number;
}

export default function SDRPerformancePage() {
  const { user } = useAuth();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const { data: sdrs = [], isLoading: loadingSDR } = useQuery({
    queryKey: ["sdr-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, monthly_lead_goal")
        .eq("role", "sdr")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const monthStart = `${selectedMonth}-01T00:00:00`;
  const [y, m] = selectedMonth.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01T00:00:00` : `${y}-${String(m + 1).padStart(2, "0")}-01T00:00:00`;

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["sdr-leads", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, assigned_to, stage, proposal_value, created_at")
        .gte("created_at", monthStart)
        .lt("created_at", nextMonth);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const metrics: SDRMetrics[] = useMemo(() => {
    return sdrs.map((sdr) => {
      const sdrLeads = leads.filter((l) => l.assigned_to === sdr.id);
      const total = sdrLeads.length;
      const qualified = sdrLeads.filter((l) => l.stage !== "lead").length;
      const qualificationRate = total > 0 ? (qualified / total) * 100 : 0;
      const meetings = sdrLeads.filter((l) => ["meeting", "proposal", "closed_won"].includes(l.stage)).length;
      const meetingsPct = total > 0 ? (meetings / total) * 100 : 0;
      const revenue = sdrLeads
        .filter((l) => l.stage === "closed_won")
        .reduce((s, l) => s + (l.proposal_value || 0), 0);

      // Score: normalize revenue (max 100k for normalization)
      const normRevenue = Math.min(revenue / 100000, 1) * 100;
      const score = Math.round(((qualificationRate * 0.3 + meetingsPct * 0.4 + normRevenue * 0.3) / 100) * 10 * 10) / 10;

      const goal = sdr.monthly_lead_goal || 25;
      const goalPct = goal > 0 ? (total / goal) * 100 : 0;

      return { id: sdr.id, name: sdr.name, leadsGenerated: total, qualificationRate, meetings, meetingsPct, revenue, score: Math.min(score, 10), goalPct, goal };
    });
  }, [sdrs, leads]);

  const totalLeads = metrics.reduce((s, m) => s + m.leadsGenerated, 0);
  const avgScore = metrics.length > 0 ? (metrics.reduce((s, m) => s + m.score, 0) / metrics.length) : 0;
  const loading = loadingSDR || loadingLeads;

  const scoreBadge = (score: number) => {
    if (score >= 8) return <Badge className="bg-success text-success-foreground">{score.toFixed(1)}</Badge>;
    if (score >= 7) return <Badge className="bg-warning text-warning-foreground">{score.toFixed(1)}</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">{score.toFixed(1)}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Performance SDR</h1>
            <p className="text-muted-foreground">Métricas individuais dos pré-vendedores</p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              {monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4 animate-fade-in">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-[#E8E0D8] animate-pulse" />)}
          </div>
        ) : sdrs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-semibold">Nenhum SDR cadastrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione SDRs na página{" "}
                <Link to="/team" className="text-primary underline">Meu Time</Link>{" "}
                para ver métricas aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{sdrs.length}</p><p className="text-xs text-muted-foreground">SDRs Ativos</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10"><TrendingUp className="h-5 w-5 text-accent" /></div>
                <div><p className="text-2xl font-bold">{totalLeads}</p><p className="text-xs text-muted-foreground">Leads Gerados</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10"><Award className="h-5 w-5 text-success" /></div>
                <div><p className="text-2xl font-bold">{avgScore.toFixed(1)}</p><p className="text-xs text-muted-foreground">Score Médio</p></div>
              </CardContent></Card>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SDR</TableHead>
                      <TableHead className="text-center">Leads</TableHead>
                      <TableHead className="text-center">Qualificação</TableHead>
                      <TableHead className="text-center">Meetings</TableHead>
                      <TableHead className="text-center hidden md:table-cell">% Meet/Leads</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Revenue</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">% da Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m, i) => (
                      <TableRow key={m.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-center">{m.leadsGenerated}</TableCell>
                        <TableCell className="text-center">{m.qualificationRate.toFixed(0)}%</TableCell>
                        <TableCell className="text-center">{m.meetings}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{m.meetingsPct.toFixed(0)}%</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{formatBRL(m.revenue)}</TableCell>
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
                <CardHeader className="pb-2"><CardTitle className="text-base">Leads por SDR</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, metrics.length * 40 + 40)}>
                    <BarChart data={[...metrics].sort((a, b) => b.leadsGenerated - a.leadsGenerated)} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 14% 90%)" />
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                      <Tooltip formatter={(v: number) => [v, "Leads"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="leadsGenerated" fill="#0B5394" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Taxa de Qualificação</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, metrics.length * 40 + 40)}>
                    <BarChart data={[...metrics].sort((a, b) => b.qualificationRate - a.qualificationRate)} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 14% 90%)" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)}%`, "Qualificação"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="qualificationRate" fill="#F39C12" radius={[0, 4, 4, 0]} barSize={20} />
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
