import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TimePeriodState } from "@/contexts/TimePeriodContext";
import {
  filterSnapshotsByRange,
  bucketSnapshots,
  type ChartBucket,
} from "@/lib/period-aggregation";

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

interface SellerKpi {
  date: string;
  revenue: number;
  [key: string]: any;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function monthLabel(monthYear: string): string {
  const [y, m] = monthYear.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

export function RevenueChart({
  snapshots,
  leads,
  timePeriod,
  sellerKpis,
}: {
  snapshots: Snapshot[];
  leads: Lead[];
  timePeriod?: TimePeriodState;
  sellerKpis?: SellerKpi[];
}) {
  const periodType = timePeriod?.periodType ?? "monthly";
  const isMonthly = periodType === "monthly";
  const useBarChart = periodType !== "daily" && periodType !== "monthly";

  const data = useMemo(() => {
    // If we have seller KPI data, aggregate by month from daily_seller_kpis
    const hasKpiData = sellerKpis && sellerKpis.length > 0;

    if (hasKpiData) {
      // Group seller KPIs by month
      const byMonth: Record<string, number> = {};
      sellerKpis!.forEach((k) => {
        const my = k.date.substring(0, 7); // "YYYY-MM"
        byMonth[my] = (byMonth[my] || 0) + (Number(k.revenue) || 0);
      });

      // If only one month, show last 6 months from snapshots + KPI overlay
      if (isMonthly) {
        const endDate = timePeriod?.endDate ?? new Date();
        const startShow = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
        const startKey = `${startShow.getFullYear()}-${String(startShow.getMonth() + 1).padStart(2, "0")}`;
        const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;

        // Build month list
        const months: string[] = [];
        const cursor = new Date(startShow);
        while (cursor <= endDate) {
          const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
          months.push(key);
          cursor.setMonth(cursor.getMonth() + 1);
        }

        return months.map((my) => {
          // Prefer KPI data, fallback to snapshot
          const kpiRev = byMonth[my];
          const snapRev = snapshots.find((s) => s.month_year === my)?.total_revenue || 0;
          return {
            label: monthLabel(my),
            revenue: kpiRev !== undefined ? kpiRev : snapRev,
          };
        });
      }

      // For non-monthly: sort and return grouped
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([my, rev]) => ({ label: monthLabel(my), revenue: rev }));
    }

    // Fallback: snapshot-based (legacy behavior)
    if (!timePeriod) {
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const currentRevenue = leads
        .filter(
          (l) =>
            l.stage === "closed_won" &&
            l.stage_changed_at &&
            l.stage_changed_at >= monthStart
        )
        .reduce((s, l) => s + (l.proposal_value || 0), 0);
      const historical = snapshots
        .filter((s) => s.month_year < currentKey)
        .slice(-5)
        .map((s) => ({
          label: monthLabel(s.month_year),
          revenue: s.total_revenue || 0,
        }));
      historical.push({ label: monthLabel(currentKey), revenue: currentRevenue });
      return historical;
    }

    if (isMonthly) {
      const endDate = timePeriod.endDate;
      const startShow = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
      const rangeSnaps = filterSnapshotsByRange(snapshots as any, startShow, endDate);
      const currentKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
      const hasCurrentSnap = rangeSnaps.some((s) => s.month_year === currentKey);
      const result = rangeSnaps.map((s) => ({
        label: monthLabel(s.month_year),
        revenue: s.total_revenue || 0,
      }));
      if (!hasCurrentSnap) {
        const monthStartIso = new Date(endDate.getFullYear(), endDate.getMonth(), 1).toISOString();
        const currentRevenue = leads
          .filter(
            (l) =>
              l.stage === "closed_won" &&
              l.stage_changed_at &&
              l.stage_changed_at >= monthStartIso
          )
          .reduce((s, l) => s + (l.proposal_value || 0), 0);
        result.push({ label: monthLabel(currentKey), revenue: currentRevenue });
      }
      return result;
    }

    const rangeSnaps = filterSnapshotsByRange(
      snapshots as any,
      timePeriod.startDate,
      timePeriod.endDate
    );
    const buckets = bucketSnapshots(rangeSnaps, periodType as ChartBucket);
    return buckets.map((b) => ({ label: b.label, revenue: b.revenue }));
  }, [snapshots, leads, timePeriod, periodType, isMonthly, sellerKpis]);

  const title = isMonthly
    ? "Receita Mensal"
    : `Receita — Visão ${
        {
          daily: "Diária",
          weekly: "Semanal",
          quarterly: "Trimestral",
          semester: "Semestral",
          yearly: "Anual",
        }[periodType] || "Mensal"
      }`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ||
        (data.length === 1 && data[0]?.revenue === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados de receita neste período.
          </p>
        ) : useBarChart ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(210 14% 90%)"
              />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatBRL(value), "Receita"]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(343, 44%, 25%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={data}
              margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(210 14% 90%)"
              />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatBRL(value), "Receita"]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(343, 44%, 25%)"
                strokeWidth={2}
                dot={{ fill: "hsl(343, 44%, 25%)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
