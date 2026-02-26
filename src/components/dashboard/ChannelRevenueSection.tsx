import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const CHART_COLORS = ["#7c3043", "#b5495b", "#d4816b", "#e8a87c", "#d4a574", "#8b6f5c", "#5e4b3b"];

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function achievementBadge(pct: number) {
  if (pct >= 90) return <Badge className="bg-green-100 text-green-700 border-green-200">{pct.toFixed(0)}%</Badge>;
  if (pct >= 60) return <Badge className="bg-orange-100 text-orange-700 border-orange-200">{pct.toFixed(0)}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">{pct.toFixed(0)}%</Badge>;
}

function progressColor(pct: number) {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 60) return "bg-orange-500";
  return "bg-red-500";
}

interface Props {
  month: number;
  year: number;
}

export function ChannelRevenueSection({ month, year }: Props) {
  const { user } = useAuth();

  const { data: channels = [] } = useQuery({
    queryKey: ["channels-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("sales_channels").select("id, name, is_active").eq("user_id", user!.id).eq("is_active", true).order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ["channel-monthly", user?.id, month, year],
    queryFn: async () => {
      const { data } = await supabase.from("channel_monthly_data").select("*").eq("user_id", user!.id).eq("month", month).eq("year", year);
      return data || [];
    },
    enabled: !!user,
  });

  if (channels.length === 0) return null;

  const rows = channels.map((ch, i) => {
    const md = monthlyData.find(d => d.channel_id === ch.id);
    const target = md?.target ?? 0;
    const actual = md?.actual ?? 0;
    const pct = target > 0 ? (actual / target) * 100 : 0;
    return { name: ch.name, target, actual, pct, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  const totalTarget = rows.reduce((s, r) => s + r.target, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const totalPct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  const donutData = rows.filter(r => r.actual > 0).map(r => ({ name: r.name, value: r.actual, color: r.color }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Table */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Faturamento por Canal</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#5B2333] hover:bg-[#5B2333]">
                <TableHead className="text-white font-semibold">Canal</TableHead>
                <TableHead className="text-white font-semibold text-right">Meta</TableHead>
                <TableHead className="text-white font-semibold text-right">Realizado</TableHead>
                <TableHead className="text-white font-semibold text-center">% Atingimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.name} className={i % 2 === 0 ? "bg-[#FAF6F0]" : "bg-white"}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatBRL(r.target)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatBRL(r.actual)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${progressColor(r.pct)}`} style={{ width: `${Math.min(r.pct, 100)}%` }} />
                      </div>
                      {achievementBadge(r.pct)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* Total */}
              <TableRow className="bg-[#F3F0EB] font-semibold border-t-2">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatBRL(totalTarget)}</TableCell>
                <TableCell className="text-right">{formatBRL(totalActual)}</TableCell>
                <TableCell className="text-center">{achievementBadge(totalPct)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Donut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participação por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Sem dados de faturamento</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {donutData.map(d => (
              <div key={d.name} className="flex items-center gap-1 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
