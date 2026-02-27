import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TimePeriodSelector } from "@/components/TimePeriodSelector";
import { useTimePeriod, toLocalDateString } from "@/contexts/TimePeriodContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MoMIndicator } from "@/components/MoMIndicator";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Link2, X } from "lucide-react";
import { parseAdsCsv, type ParseResult } from "@/lib/csv-ad-parser";
function fmtBrl(n: number) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function fmtPct(n: number) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toFixed(2).replace(".", ",") + "%";
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const FIELD_LABELS: Record<string, string> = {
  date: "Data",
  investment: "Investimento",
  impressions: "Impressões",
  clicks: "Cliques",
  page_views: "Page Views",
  leads_from_ads: "Leads",
};

interface DayRow {
  day: number;
  date: string;
  investment: string;
  impressions: string;
  clicks: string;
  page_views: string;
  leads_from_ads: string;
  id?: string;
}

export default function PaidTrafficPage() {
  const { profile } = useAuth();
  const { startDate, endDate } = useTimePeriod();
  
  const month = startDate.getMonth();
  const year = startDate.getFullYear();
  const [rows, setRows] = useState<DayRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [prevMonthData, setPrevMonthData] = useState<{ investment: number; cpl: number; ctr: number; roas: number } | null>(null);
  const [manualEdit, setManualEdit] = useState(false);

  // CSV import state
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [existingDates, setExistingDates] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const numDays = new Date(year, month + 1, 0).getDate();
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
    const startDateStr = toLocalDateString(startDate);
    const endDateStr = toLocalDateString(endDate);
    const prevDate = new Date(year, month - 1, 1);
    const prevMonthYear = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const prevNumDays = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
    const prevStartDate2 = `${prevMonthYear}-01`;
    const prevEndDate2 = `${prevMonthYear}-${String(prevNumDays).padStart(2, "0")}`;

    const fetchData = async () => {
      const [adRes, snapRes, prevAdRes, prevSnapRes] = await Promise.all([
        supabase.from("ad_metrics" as any).select("*").eq("user_id", profile.id).gte("date", startDateStr).lte("date", endDateStr),
        supabase.from("monthly_snapshots").select("total_revenue").eq("user_id", profile.id).eq("month_year", monthYear).limit(1),
        supabase.from("ad_metrics" as any).select("*").eq("user_id", profile.id).gte("date", prevStartDate2).lte("date", prevEndDate2),
        supabase.from("monthly_snapshots").select("total_revenue").eq("user_id", profile.id).eq("month_year", prevMonthYear).limit(1),
      ]);

      const empty = buildEmptyRows();
      const dates = new Set<string>();
      if (adRes.data) {
        for (const rec of adRes.data as any[]) {
          const d = new Date(rec.date);
          const idx = d.getDate() - 1;
          dates.add(rec.date);
          if (idx >= 0 && idx < empty.length) {
            empty[idx] = {
              ...empty[idx], id: rec.id,
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
      setExistingDates(dates);
      setMonthlyRevenue(snapRes.data?.[0]?.total_revenue ?? 0);

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
  }, [profile?.id, monthYear, numDays, buildEmptyRows, startDate, endDate]);

  const updateCell = (idx: number, field: keyof DayRow, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const toN = (s: string) => parseFloat(s) || 0;

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

  const chartData = useMemo(() => {
    return rows.map((r) => ({ day: r.day, investimento: toN(r.investment), leads: toN(r.leads_from_ads) }));
  }, [rows]);

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    const toUpsert = rows
      .filter((r) => toN(r.investment) > 0 || toN(r.impressions) > 0 || toN(r.clicks) > 0 || toN(r.page_views) > 0 || toN(r.leads_from_ads) > 0)
      .map((r) => ({
        user_id: profile.id, date: r.date,
        investment: toN(r.investment), impressions: Math.round(toN(r.impressions)),
        clicks: Math.round(toN(r.clicks)), page_views: Math.round(toN(r.page_views)),
        leads_from_ads: Math.round(toN(r.leads_from_ads)),
      }));

    if (toUpsert.length === 0) { toast.info("Nenhum dado para salvar"); setSaving(false); return; }

    const { error } = await (supabase.from("ad_metrics" as any) as any).upsert(toUpsert, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar dados"); console.error(error); }
    else { toast.success("Dados salvos com sucesso!"); }
  };

  // CSV handlers
  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(csv|xlsx?)$/i)) {
      toast.error("Formato não suportado. Use .csv ou .xlsx");
      return;
    }
    const result = await parseAdsCsv(file);
    if (result.errors.length > 0 && result.rows.length === 0) {
      toast.error(result.errors[0]);
      return;
    }
    setParseResult(result);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = async () => {
    if (!profile?.id || !parseResult) return;
    setImporting(true);

    const toUpsert = parseResult.rows.map((r) => ({
      user_id: profile.id, date: r.date,
      investment: r.investment, impressions: r.impressions,
      clicks: r.clicks, page_views: r.page_views, leads_from_ads: r.leads_from_ads,
    }));

    // Batch insert 500 at a time
    for (let i = 0; i < toUpsert.length; i += 500) {
      const batch = toUpsert.slice(i, i + 500);
      const { error } = await (supabase.from("ad_metrics" as any) as any).upsert(batch, { onConflict: "user_id,date" });
      if (error) {
        toast.error("Erro ao importar dados");
        console.error(error);
        setImporting(false);
        return;
      }
    }

    toast.success(`${toUpsert.length} dias importados com sucesso!`);
    setImporting(false);
    setParseResult(null);
    // Refresh
    window.location.reload();
  };

  const overlappingDates = useMemo(() => {
    if (!parseResult) return 0;
    return parseResult.rows.filter((r) => existingDates.has(r.date)).length;
  }, [parseResult, existingDates]);

  const previewRows = parseResult?.rows.slice(0, 5) ?? [];
  const totalImportInvestment = parseResult?.rows.reduce((s, r) => s + r.investment, 0) ?? 0;


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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tráfego Pago</h1>
          <p className="text-muted-foreground mt-1">Acompanhe o funil completo de mídia paga</p>
        </div>

        <TimePeriodSelector />

        {/* Coming Soon - Direct Connection */}
        <Card className="border-dashed border-2 border-muted-foreground/30 opacity-70">
          <CardContent className="py-5 flex items-center gap-4">
            <div className="rounded-full bg-muted p-3">
              <Link2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">Conexão Direta com Meta Ads</p>
                <Badge variant="secondary" className="text-xs">Em Breve</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Em breve: conecte sua conta e os dados serão importados automaticamente</p>
            </div>
          </CardContent>
        </Card>

        {/* CSV Import Zone / Preview */}
        {parseResult ? (
          /* Preview screen */
          <Card>
            <CardContent className="py-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Prévia da Importação</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{parseResult.platform}</Badge>
                    <span className="text-sm text-muted-foreground">{parseResult.rows.length} dias de dados encontrados</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setParseResult(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {parseResult.rows.length > 0 && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Período: {fmtDate(parseResult.rows[0].date)} a {fmtDate(parseResult.rows[parseResult.rows.length - 1].date)}</p>
                  <p>Investimento total: {fmtBrl(totalImportInvestment)}</p>
                </div>
              )}

              {/* Column mapping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {Object.entries(parseResult.columnMap).map(([field, original]) => (
                  <div key={field} className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="font-medium">{FIELD_LABELS[field] || field}:</span>
                    <span className="text-muted-foreground">mapeado para '{original}'</span>
                  </div>
                ))}
              </div>

              {overlappingDates > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                  <p className="text-sm text-orange-800">
                    {overlappingDates} dias já possuem dados. Os valores serão atualizados.
                  </p>
                </div>
              )}

              {parseResult.errors.length > 0 && (
                <div className="text-sm text-orange-600 space-y-0.5">
                  {parseResult.errors.map((e, i) => <p key={i}>⚠️ {e}</p>)}
                </div>
              )}

              {/* Preview table */}
              {previewRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-3 py-2 text-left font-medium">Data</th>
                        <th className="px-3 py-2 text-right font-medium">Investimento</th>
                        <th className="px-3 py-2 text-right font-medium">Impressões</th>
                        <th className="px-3 py-2 text-right font-medium">Cliques</th>
                        <th className="px-3 py-2 text-right font-medium">Page Views</th>
                        <th className="px-3 py-2 text-right font-medium">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-card"}>
                          <td className="px-3 py-1.5">{fmtDate(r.date)}</td>
                          <td className="px-3 py-1.5 text-right">{fmtBrl(r.investment)}</td>
                          <td className="px-3 py-1.5 text-right">{r.impressions.toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-1.5 text-right">{r.clicks.toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-1.5 text-right">{r.page_views.toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-1.5 text-right">{r.leads_from_ads.toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parseResult.rows.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ...e mais {parseResult.rows.length - 5} dias
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setParseResult(null)}>Cancelar</Button>
                <Button onClick={handleConfirmImport} disabled={importing || parseResult.rows.length === 0}>
                  {importing ? "Importando…" : "Confirmar Importação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Upload zone */
          <Card>
            <CardContent className="py-6">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-foreground">Importar Dados do Meta Ads</h2>
                <p className="text-sm text-muted-foreground">Exporte seu relatório do Gerenciador de Anúncios e faça upload aqui</p>
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-1">Arraste e solte seu arquivo aqui, ou clique para buscar</p>
                <p className="text-xs text-muted-foreground">Formatos aceitos: .csv, .xlsx</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                />
              </div>
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar Arquivo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-medium text-foreground">Dados Diários</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Editar manualmente</span>
              <Switch checked={manualEdit} onCheckedChange={setManualEdit} />
            </div>
          </div>
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
                        {manualEdit ? (
                          <input
                            type="number"
                            min={0}
                            step={c.type === "currency" ? "0.01" : "1"}
                            className="w-full text-right bg-transparent border border-transparent hover:border-input focus:border-ring focus:outline-none rounded px-2 py-1.5 text-sm"
                            value={row[c.key] as string}
                            onChange={(e) => updateCell(idx, c.key, e.target.value)}
                            placeholder="0"
                          />
                        ) : (
                          <span className="block text-right px-2 py-1.5 text-sm text-foreground">
                            {c.type === "currency" && toN(row[c.key] as string) > 0
                              ? fmtBrl(toN(row[c.key] as string))
                              : toN(row[c.key] as string) > 0
                              ? Math.round(toN(row[c.key] as string)).toLocaleString("pt-BR")
                              : "—"}
                          </span>
                        )}
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

        {/* Save (only when manual edit is on) */}
        {manualEdit && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto px-8">
              {saving ? "Salvando…" : "Salvar Dados"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
