import { useState, useEffect, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MoMIndicator } from "@/components/MoMIndicator";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function fmtBrl(n: number) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function fmtPct(n: number) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toFixed(2).replace(".", ",") + "%";
}

interface DayRow {
  day: number;
  date: string; // YYYY-MM-DD
  investment: string;
  impressions: string;
  clicks: string;
  page_views: string;
  leads_from_ads: string;
  id?: string; // existing record id
}

export default function PaidTrafficPage() {
  const { profile } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<DayRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [prevMonthData, setPrevMonthData] = useState<{ investment: number; cpl: number; ctr: number; roas: number } | null>(null);

  const numDays = daysInMonth(month, year);
  const monthYear = `${year}-${String(month + 1).padStart(2, "0")}`;

  const buildEmptyRows = useCallback(() => {
    return Array.from({ length: numDays }, (_, i) => {
      const day = i + 1;
      return {
        day,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        investment: "", impressions: "", clicks: "", page_views: "", leads_from_ads: "",
      } as DayRow;
    });
  }, [numDays, month, year]);

  useEffect(() => {
    if (!profile?.id) return;
    const startDate = `${monthYear}-01`;
    const endDate = `${monthYear}-${String(numDays).padStart(2, "0")}`;

    // Calculate previous month
    const prevDate = new Date(year, month - 1, 1);
    const prevMonthYear = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const prevNumDays = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
    const prevStartDate = `${prevMonthYear}-01`;
    const prevEndDate = `${prevMonthYear}-${String(prevNumDays).padStart(2, "0")}`;

    const fetchData = async () => {
      const [adRes, snapRes, prevAdRes, prevSnapRes] = await Promise.all([
        supabase
          .from("ad_metrics" as any)
          .select("*")
          .eq("user_id", profile.id)
          .gte("date", startDate)
          .lte("date", endDate),
        supabase
          .from("monthly_snapshots")
          .select("total_revenue")
          .eq("user_id", profile.id)
          .eq("month_year", monthYear)
          .limit(1),
        supabase
          .from("ad_metrics" as any)
          .select("*")
          .eq("user_id", profile.id)
          .gte("date", prevStartDate)
          .lte("date", prevEndDate),
        supabase
          .from("monthly_snapshots")
          .select("total_revenue")
          .eq("user_id", profile.id)
          .eq("month_year", prevMonthYear)
          .limit(1),
      ]);

      const empty = buildEmptyRows();
      if (adRes.data) {
        for (const rec of adRes.data as any[]) {
          const d = new Date(rec.date);
          const idx = d.getDate() - 1;
          if (idx >= 0 && idx < empty.length) {
            empty[idx] = {
              ...empty[idx],
              id: rec.id,
              investment: rec.investment?.toString() ?? "",
              impressions: rec.impressions?.toString() ?? "",
              clicks: rec.clicks?.toString() ?? "",
              page_views: rec.page_views?.toString() ?? "",
              leads_from_ads: rec.leads_from_ads?.toString() ?? "",
            };
          }
        }
      }
      setRows(empty);
      setMonthlyRevenue(snapRes.data?.[0]?.total_revenue ?? 0);

      // Compute previous month totals
      if (prevAdRes.data && prevAdRes.data.length > 0) {
        const pt = { investment: 0, impressions: 0, clicks: 0, leads: 0 };
        (prevAdRes.data as any[]).forEach(r => {
          pt.investment += Number(r.investment) || 0;
          pt.impressions += Number(r.impressions) || 0;
          pt.clicks += Number(r.clicks) || 0;
          pt.leads += Number(r.leads_from_ads) || 0;
        });
        const prevRev = prevSnapRes.data?.[0]?.total_revenue ?? 0;
        setPrevMonthData({
          investment: pt.investment,
          cpl: pt.leads > 0 ? pt.investment / pt.leads : 0,
          ctr: pt.impressions > 0 ? (pt.clicks / pt.impressions) * 100 : 0,
          roas: pt.investment > 0 ? prevRev / pt.investment : 0,
        });
      } else {
        setPrevMonthData(null);
      }
    };
    fetchData();
  }, [profile?.id, monthYear, numDays, buildEmptyRows]);

  const updateCell = (idx: number, field: keyof DayRow, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const toN = (s: string) => parseFloat(s) || 0;

  // Totals
  const totals = useMemo(() => {
    const t = { investment: 0, impressions: 0, clicks: 0, page_views: 0, leads_from_ads: 0 };
    rows.forEach((r) => {
      t.investment += toN(r.investment);
      t.impressions += toN(r.impressions);
      t.clicks += toN(r.clicks);
      t.page_views += toN(r.page_views);
      t.leads_from_ads += toN(r.leads_from_ads);
    });
    return t;
  }, [rows]);

  const cpl = totals.leads_from_ads > 0 ? totals.investment / totals.leads_from_ads : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const roas = totals.investment > 0 ? monthlyRevenue / totals.investment : 0;

  // Chart data
  const chartData = useMemo(() => {
    return rows.map((r) => ({
      day: r.day,
      investimento: toN(r.investment),
      leads: toN(r.leads_from_ads),
    }));
  }, [rows]);

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    const toUpsert = rows
      .filter((r) => toN(r.investment) > 0 || toN(r.impressions) > 0 || toN(r.clicks) > 0 || toN(r.page_views) > 0 || toN(r.leads_from_ads) > 0)
      .map((r) => ({
        user_id: profile.id,
        date: r.date,
        investment: toN(r.investment),
        impressions: Math.round(toN(r.impressions)),
        clicks: Math.round(toN(r.clicks)),
        page_views: Math.round(toN(r.page_views)),
        leads_from_ads: Math.round(toN(r.leads_from_ads)),
      }));

    if (toUpsert.length === 0) {
      toast.info("Nenhum dado para salvar");
      setSaving(false);
      return;
    }

    const { error } = await (supabase.from("ad_metrics" as any) as any).upsert(toUpsert, {
      onConflict: "user_id,date",
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar dados");
      console.error(error);
    } else {
      toast.success("Dados salvos com sucesso!");
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const cols: { key: keyof DayRow; label: string; type: "currency" | "number" }[] = [
    { key: "investment", label: "Investimento", type: "currency" },
    { key: "impressions", label: "Impressões", type: "number" },
    { key: "clicks", label: "Cliques", type: "number" },
    { key: "page_views", label: "Page Views", type: "number" },
    { key: "leads_from_ads", label: "Leads", type: "number" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tráfego Pago</h1>
            <p className="text-muted-foreground mt-1">Acompanhe o funil completo de mídia paga</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Investimento Total", value: fmtBrl(totals.investment), prev: prevMonthData?.investment, fmt: fmtBrl },
            { label: "CPL Médio", value: fmtBrl(cpl), prev: prevMonthData?.cpl, fmt: fmtBrl, invert: true },
            { label: "CTR Médio", value: fmtPct(ctr), prev: prevMonthData?.ctr, fmt: fmtPct },
            { label: "ROAS", value: roas > 0 ? `${roas.toFixed(2).replace(".", ",")}x` : "—", prev: prevMonthData?.roas, fmt: (v: number) => `${v.toFixed(2).replace(".", ",")}x` },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="py-5 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{c.value}</p>
                <div className="mt-1.5 flex justify-center">
                  <MoMIndicator
                    current={c.label === "Investimento Total" ? totals.investment : c.label === "CPL Médio" ? cpl : c.label === "CTR Médio" ? ctr : roas}
                    previous={c.prev ?? null}
                    format={c.fmt}
                    invertColor={c.invert}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mini Chart */}
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-foreground mb-3">Investimento vs Leads por dia</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="investimento" name="Investimento (R$)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto [&_table_td:first-child]:sticky [&_table_td:first-child]:left-0 [&_table_td:first-child]:z-10 [&_table_td:first-child]:bg-inherit [&_table_th:first-child]:sticky [&_table_th:first-child]:left-0 [&_table_th:first-child]:z-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-3 py-2.5 text-left font-medium w-20">Data</th>
                  {cols.map((c) => (
                    <th key={c.key} className="px-3 py-2.5 text-right font-medium">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.day} className={idx % 2 === 0 ? "bg-background" : "bg-card"}>
                    <td className="px-3 py-1.5 text-muted-foreground font-medium">
                      {String(row.day).padStart(2, "0")}/{String(month + 1).padStart(2, "0")}
                    </td>
                    {cols.map((c) => (
                      <td key={c.key} className="px-1 py-0.5">
                        <input
                          type="number"
                          min={0}
                          step={c.type === "currency" ? "0.01" : "1"}
                          className="w-full text-right bg-transparent border border-transparent hover:border-input focus:border-ring focus:outline-none rounded px-2 py-1.5 text-sm"
                          value={row[c.key] as string}
                          onChange={(e) => updateCell(idx, c.key, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted">
                  <td className="px-3 py-2.5">TOTAL</td>
                  <td className="px-3 py-2.5 text-right">{fmtBrl(totals.investment)}</td>
                  <td className="px-3 py-2.5 text-right">{totals.impressions.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2.5 text-right">{totals.clicks.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2.5 text-right">{totals.page_views.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2.5 text-right">{totals.leads_from_ads.toLocaleString("pt-BR")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto px-8">
            {saving ? "Salvando…" : "Salvar Dados"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
