import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, DollarSign, TrendingDown } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  active: "#16a34a",
  cancelled: "#dc2626",
  expired: "#f59e0b",
  inactive: "#6b7280",
  trial: "#3b82f6",
};

export default function AdminDashboardPage() {
  const { data: users = [] } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const active = users.filter((u) => u.subscription_status === "active").length;
    const newThisWeek = users.filter(
      (u) => u.created_at && new Date(u.created_at) >= weekAgo
    ).length;
    const cancelled = users.filter((u) => u.subscription_status === "cancelled").length;
    const estimatedRevenue = active * 67;

    // Churn approximation: cancelled this month / active count
    const cancelledThisMonth = users.filter(
      (u) =>
        u.subscription_status === "cancelled" &&
        u.updated_at &&
        new Date(u.updated_at) >= startOfMonth
    ).length;
    const churnRate = active > 0 ? ((cancelledThisMonth / (active + cancelledThisMonth)) * 100).toFixed(1) : "0";

    return { active, newThisWeek, cancelled, estimatedRevenue, churnRate };
  }, [users]);

  // Weekly new users (last 12 weeks)
  const weeklyData = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = users.filter(
        (u) => u.created_at && new Date(u.created_at) >= weekStart && new Date(u.created_at) < weekEnd
      ).length;
      weeks.push({
        label: `S${12 - i}`,
        count,
      });
    }
    return weeks;
  }, [users]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      const s = u.subscription_status || "inactive";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [users]);

  const summaryCards = [
    { label: "Usuários Ativos", value: stats.active, icon: UserCheck, color: "text-green-600" },
    { label: "Novos esta Semana", value: stats.newThisWeek, icon: Users, color: "text-blue-600" },
    { label: "Total Cancelados", value: stats.cancelled, icon: UserX, color: "text-red-600" },
    { label: "Receita Estimada", value: `R$ ${stats.estimatedRevenue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-green-600" },
    { label: "Taxa de Churn", value: `${stats.churnRate}%`, icon: TrendingDown, color: "text-orange-600" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
                  <card.icon className="h-4 w-4" />
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line chart - New users per week */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-base">Novos Usuários por Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#7c3043" strokeWidth={2} dot={{ r: 3 }} name="Novos" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar chart - Status distribution */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Usuários" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
