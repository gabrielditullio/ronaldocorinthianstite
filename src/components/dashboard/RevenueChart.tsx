import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TimePeriodState } from "@/contexts/TimePeriodContext";
import { filterSnapshotsByRange, bucketSnapshots, type ChartBucket } from "@/lib/period-aggregation";

interface Snapshot {
  month_year: string;
  total_revenue: number | null;
  [key: string]: any;
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

export function RevenueChart({ snapshots, leads, timePeriod }: { snapshots: Snapshot[]; leads: Lead[]; timePeriod?: TimePeriodState }) {
  const periodType = timePeriod?.periodType ?? "monthly";
  const isMonthly = periodType === "monthly";
  const useBarChart = periodType !== "daily" && periodType !== "monthly";

  const data = useMemo(() => {
    if (!timePeriod) {
      // Legacy behavior: last 6 months
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const currentRevenue = leads
        .filter((l) => l.stage === "closed_won" && l.stage_changed_at && l.stage_changed_at >= monthStart)
        .reduce((s, l) => s + (l.proposal_value || 0), 0);
      const historical = snapshots
        .filter((s) => s.month_year < currentKey)
        .slice(-5)
        .map((s) => ({ label: monthLabel(s.month_year), revenue: s.total_revenue || 0 }));
      historical.push({ label: monthLabel(currentKey), revenue: currentRevenue });
      return historical;
    }

    // For non-monthly periods, show data bucketed by period type
    // For monthly, keep the classic 6-month view centered on selected month
    if (isMonthly) {
      const endDate = timePeriod.endDate;
      const startShow = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
      const rangeSnaps = filterSnapshotsByRange(snapshots as any, startShow, endDate);

      // Add current month revenue from leads if not in snapshots
      const currentKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
      const hasCurrentSnap = rangeSnaps.some((s) => s.month_year === currentKey);

      const result = rangeSnaps.map((s) => ({
        label: monthLabel(s.month_year),
        revenue: s.total_revenue || 0,
      }));

      if (!hasCurrentSnap) {
        const monthStartIso = new Date(endDate.getFullYear(), endDate.getMonth(), 1).toISOString();
        const currentRevenue = leads
          .filter((l) => l.stage === "closed_won" && l.stage_changed_at && l.stage_changed_at >= monthStartIso)
          .reduce((s, l) => s + (l.proposal_value || 0), 0);
        result.push({ label: monthLabel(currentKey), revenue: currentRevenue });
      }

      return result;
    }

    // For other periods, bucket the filtered data
    const rangeSnaps = filterSnapshotsByRange(snapshots as any, timePeriod.startDate, timePeriod.endDate);
    const buckets = bucketSnapshots(rangeSnaps, periodType as ChartBucket);
    return buckets.map((b) => ({ label: b.label, revenue: b.revenue }));
  }, [snapshots, leads, timePeriod, periodType, isMonthly]);

  const title = isMonthly ? "Receita Mensal" : `Receita — Visão ${
    { daily: "Diária", weekly: "Semanal", quarterly: "Trimestral", semester: "Semestral", yearly: "Anual" }[periodType] || "Mensal"
  }`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || (data.length === 1 && data[0]?.revenue === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de receita neste período.</p>
        ) : useBarChart ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 14% 90%)" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [formatBRL(value), "Receita"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="hsl(343, 44%, 25%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 14% 90%)" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [formatBRL(value), "Receita"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(343, 44%, 25%)" strokeWidth={2} dot={{ fill: "hsl(343, 44%, 25%)", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
