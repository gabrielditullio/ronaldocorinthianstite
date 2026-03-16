import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface SellerKpi {
  date: string;
  leads_generated: number;
  sales: number;
  revenue: number;
  [key: string]: any;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

const SERIES = [
  { key: "leads", label: "Leads", color: "hsl(var(--primary))" },
  { key: "sales", label: "Vendas", color: "hsl(var(--success, 142 71% 45%))" },
  { key: "revenue", label: "Receita", color: "hsl(var(--accent))" },
] as const;

export function DailyEvolutionChart({ sellerKpis }: { sellerKpis: SellerKpi[] }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    leads: true, sales: true, revenue: true,
  });

  const data = useMemo(() => {
    const byDate: Record<string, { leads: number; sales: number; revenue: number }> = {};
    sellerKpis.forEach((k) => {
      if (!byDate[k.date]) byDate[k.date] = { leads: 0, sales: 0, revenue: 0 };
      byDate[k.date].leads += k.leads_generated ?? 0;
      byDate[k.date].sales += k.sales ?? 0;
      byDate[k.date].revenue += Number(k.revenue) || 0;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        label: date.substring(5).replace("-", "/"),
        ...vals,
      }));
  }, [sellerKpis]);

  const toggle = (key: string) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Evolução Diária</CardTitle>
          <div className="flex gap-1.5">
            {SERIES.map((s) => (
              <Badge
                key={s.key}
                variant={visible[s.key] ? "default" : "outline"}
                className="cursor-pointer select-none text-xs"
                style={visible[s.key] ? { backgroundColor: s.color, color: "white" } : {}}
                onClick={() => toggle(s.key)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis yAxisId="left" fontSize={11} />
            <YAxis yAxisId="right" orientation="right" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "revenue") return [formatBRL(value), "Receita"];
                if (name === "sales") return [value, "Vendas"];
                return [value, "Leads"];
              }}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            {visible.leads && (
              <Line yAxisId="left" type="monotone" dataKey="leads" stroke={SERIES[0].color} strokeWidth={2} dot={{ r: 2 }} />
            )}
            {visible.sales && (
              <Line yAxisId="left" type="monotone" dataKey="sales" stroke={SERIES[1].color} strokeWidth={2} dot={{ r: 2 }} />
            )}
            {visible.revenue && (
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke={SERIES[2].color} strokeWidth={2} dot={{ r: 2 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
