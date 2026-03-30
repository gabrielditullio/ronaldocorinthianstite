import { useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, X, CheckCircle2, AlertTriangle, Megaphone, TrendingUp, Eye, DollarSign, Target } from "lucide-react";
import { parseMetaAdsCsv, type MetaAdsParseResult } from "@/lib/meta-ads-parser";

function fmtBrl(n: number) {
  if (!isFinite(n) || isNaN(n) || n === 0) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function fmtNum(n: number) {
  if (!n) return "—";
  return n.toLocaleString("pt-BR");
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() || "";
  if (s === "active") return <Badge className="bg-green-100 text-green-800 border-green-300">Ativa</Badge>;
  if (s === "inactive") return <Badge className="bg-muted text-muted-foreground">Inativa</Badge>;
  if (s === "archived") return <Badge variant="outline" className="text-muted-foreground">Arquivada</Badge>;
  return <Badge variant="outline">{status || "—"}</Badge>;
}

export default function MetaAdsCampaignsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState<MetaAdsParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["meta-ads-campaigns"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("meta_ads_campaigns" as any) as any)
        .select("*")
        .order("amount_spent", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile?.id,
  });

  const totals = useMemo(() => {
    const t = { spent: 0, impressions: 0, reach: 0, results: 0 };
    campaigns.forEach((c: any) => {
      t.spent += Number(c.amount_spent) || 0;
      t.impressions += Number(c.impressions) || 0;
      t.reach += Number(c.reach) || 0;
      t.results += Number(c.results) || 0;
    });
    return t;
  }, [campaigns]);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(csv|xlsx?|tsv)$/i)) {
      toast.error("Formato não suportado. Use .csv ou .xlsx");
      return;
    }
    const result = await parseMetaAdsCsv(file);
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
      user_id: profile.id,
      report_start_date: r.report_start_date,
      report_end_date: r.report_end_date,
      campaign_name: r.campaign_name,
      delivery_status: r.delivery_status,
      results: r.results,
      result_indicator: r.result_indicator,
      cost_per_result: r.cost_per_result,
      ad_set_budget: r.ad_set_budget,
      budget_type: r.budget_type,
      amount_spent: r.amount_spent,
      impressions: r.impressions,
      reach: r.reach,
      end_date: r.end_date,
      attribution_setting: r.attribution_setting,
    }));

    for (let i = 0; i < toUpsert.length; i += 100) {
      const batch = toUpsert.slice(i, i + 100);
      const { error } = await (supabase.from("meta_ads_campaigns" as any) as any)
        .upsert(batch, { onConflict: "user_id,campaign_name,report_start_date,report_end_date" });
      if (error) {
        toast.error("Erro ao importar dados");
        console.error(error);
        setImporting(false);
        return;
      }
    }

    toast.success(`${toUpsert.length} campanhas importadas!`);
    setImporting(false);
    setParseResult(null);
    queryClient.invalidateQueries({ queryKey: ["meta-ads-campaigns"] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas Meta Ads</h1>
          <p className="text-muted-foreground mt-1">Importe relatórios do Meta Ads e visualize suas campanhas</p>
        </div>

        {/* KPI Cards */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total Investido</span>
                </div>
                <p className="text-lg font-bold">{fmtBrl(totals.spent)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Impressões</span>
                </div>
                <p className="text-lg font-bold">{fmtNum(totals.impressions)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Alcance</span>
                </div>
                <p className="text-lg font-bold">{fmtNum(totals.reach)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Resultados</span>
                </div>
                <p className="text-lg font-bold">{fmtNum(totals.results)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Import Zone / Preview */}
        {parseResult ? (
          <Card>
            <CardContent className="py-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Prévia da Importação</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {parseResult.rows.length} campanhas · Investimento total: {fmtBrl(parseResult.totalSpent)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setParseResult(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="text-sm text-orange-600 space-y-0.5">
                  {parseResult.errors.map((e, i) => <p key={i}>⚠️ {e}</p>)}
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-3 py-2 text-left font-medium">Campanha</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Investido</th>
                      <th className="px-3 py-2 text-right font-medium">Impressões</th>
                      <th className="px-3 py-2 text-right font-medium">Alcance</th>
                      <th className="px-3 py-2 text-right font-medium">Resultados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-card"}>
                        <td className="px-3 py-1.5 max-w-[250px] truncate">{r.campaign_name}</td>
                        <td className="px-3 py-1.5">{statusBadge(r.delivery_status)}</td>
                        <td className="px-3 py-1.5 text-right">{fmtBrl(r.amount_spent)}</td>
                        <td className="px-3 py-1.5 text-right">{fmtNum(r.impressions)}</td>
                        <td className="px-3 py-1.5 text-right">{fmtNum(r.reach)}</td>
                        <td className="px-3 py-1.5 text-right">{r.results || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.rows.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ...e mais {parseResult.rows.length - 8} campanhas
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setParseResult(null)}>Cancelar</Button>
                <Button onClick={handleConfirmImport} disabled={importing || parseResult.rows.length === 0}>
                  {importing ? "Importando…" : "Confirmar Importação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-foreground">Importar Relatório do Meta Ads</h2>
                <p className="text-sm text-muted-foreground">
                  Exporte o relatório de campanhas do Gerenciador de Anúncios (formato CSV) e faça upload aqui
                </p>
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
                  accept=".csv,.xlsx,.xls,.tsv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaigns Table */}
        {campaigns.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Investido</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Impressões</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Alcance</TableHead>
                    <TableHead className="text-right">Resultados</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Custo/Resultado</TableHead>
                    <TableHead className="hidden lg:table-cell">Período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium max-w-[250px] truncate">{c.campaign_name}</TableCell>
                      <TableCell>{statusBadge(c.delivery_status)}</TableCell>
                      <TableCell className="text-right">{fmtBrl(Number(c.amount_spent))}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">{fmtNum(c.impressions)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">{fmtNum(c.reach)}</TableCell>
                      <TableCell className="text-right">{c.results || "—"}</TableCell>
                      <TableCell className="text-right hidden lg:table-cell">{fmtBrl(Number(c.cost_per_result))}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {c.report_start_date && c.report_end_date
                          ? `${new Date(c.report_start_date).toLocaleDateString("pt-BR")} – ${new Date(c.report_end_date).toLocaleDateString("pt-BR")}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!isLoading && campaigns.length === 0 && !parseResult && (
          <Card>
            <CardContent className="py-16 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground">Nenhuma campanha importada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Importe seu relatório do Meta Ads para visualizar suas campanhas aqui
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
