import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Snapshot {
  month_year: string;
  total_revenue: number | null;
}

interface Lead {
  stage: string;
  proposal_value: number | null;
  stage_changed_at: string | null;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function monthLabel(monthYear: string): string {
  const [y, m] = monthYear.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

export function RevenueChart({ snapshots, leads }: { snapshots: Snapshot[]; leads: Lead[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Current month revenue from leads
    const currentRevenue = leads
      .filter((l) => l.stage === "closed_won" && l.stage_changed_at && l.stage_changed_at >= monthStart)
      .reduce((s, l) => s + (l.proposal_value || 0), 0);

    // Historical from snapshots (last 6)
    const historical = snapshots
      .filter((s) => s.month_year < currentKey)
      .slice(-5)
      .map((s) => ({ month: monthLabel(s.month_year), revenue: s.total_revenue || 0 }));

    historical.push({ month: monthLabel(currentKey), revenue: currentRevenue });
    return historical;
  }, [snapshots, leads]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Receita Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length <= 1 && data[0]?.revenue === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de receita ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 14% 90%)" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [formatBRL(value), "Receita"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#0B5394" strokeWidth={2} dot={{ fill: "#0B5394", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
