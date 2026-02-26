import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Download, FileText, Copy } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const preview = rows.slice(0, 5);
  if (preview.length === 0) return <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>;
  return (
    <div className="overflow-auto border rounded mt-3">
      <Table>
        <TableHeader>
          <TableRow>{headers.map((h) => <TableHead key={h} className="text-xs bg-[#3D1520] text-white">{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {preview.map((r, i) => (
            <TableRow key={i} className={i % 2 === 1 ? "bg-muted/30" : ""}>
              {r.map((c, j) => <TableCell key={j} className="text-xs">{c}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > 5 && <p className="text-xs text-muted-foreground p-2">...e mais {rows.length - 5} registros</p>}
    </div>
  );
}

// ─── Users Export ──────────────────────────────────
function UsersExportSection() {
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-export-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let list = users;
    if (status !== "all") list = list.filter((u) => u.subscription_status === status);
    if (dateFrom) list = list.filter((u) => u.created_at && u.created_at >= dateFrom);
    if (dateTo) list = list.filter((u) => u.created_at && u.created_at <= dateTo + "T23:59:59");
    return list;
  }, [users, status, dateFrom, dateTo]);

  const headers = ["Nome", "Email", "Status", "Data Cadastro", "Order Bump"];
  const rows = filtered.map((u) => [
    u.full_name || "", u.email, u.subscription_status,
    u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "",
    u.has_order_bump ? "Sim" : "Não",
  ]);

  return (
    <Card className="bg-white">
      <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Exportar Usuários</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" className="w-[140px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" className="w-[140px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          <Button className="bg-[#3D1520] hover:bg-[#4d2030] text-white" onClick={() => { downloadCSV(`raiox_usuarios_${today()}.csv`, headers, rows); toast.success("CSV exportado!"); }}>
            <Download className="h-4 w-4 mr-1" /> Exportar Lista Completa (CSV)
          </Button>
        </div>
        <PreviewTable headers={headers} rows={rows} />
      </CardContent>
    </Card>
  );
}

// ─── Webhooks Export ──────────────────────────────
function WebhooksExportSection() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["admin-export-webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let list = logs;
    if (dateFrom) list = list.filter((l) => l.created_at && l.created_at >= dateFrom);
    if (dateTo) list = list.filter((l) => l.created_at && l.created_at <= dateTo + "T23:59:59");
    return list;
  }, [logs, dateFrom, dateTo]);

  const headers = ["Data", "Evento", "Email", "Transaction ID"];
  const rows = filtered.map((l) => {
    const p = l.payload as any;
    return [
      l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "",
      p?.event || p?.type || "unknown",
      p?.data?.client?.email || p?.email || "",
      p?.data?.transaction?.id || p?.transaction_id || "",
    ];
  });

  return (
    <Card className="bg-white">
      <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Exportar Webhook Logs</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" className="w-[140px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" className="w-[140px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          <Button className="bg-[#3D1520] hover:bg-[#4d2030] text-white" onClick={() => { downloadCSV(`raiox_webhooks_${today()}.csv`, headers, rows); toast.success("CSV exportado!"); }}>
            <Download className="h-4 w-4 mr-1" /> Exportar Logs (CSV)
          </Button>
        </div>
        <PreviewTable headers={headers} rows={rows} />
      </CardContent>
    </Card>
  );
}

// ─── Engagement Export ────────────────────────────
function EngagementExportSection() {
  const { data: users = [] } = useQuery({
    queryKey: ["admin-export-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["admin-export-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("monthly_snapshots").select("user_id");
      if (error) return [];
      return data || [];
    },
  });

  const { data: simulations = [] } = useQuery({
    queryKey: ["admin-export-simulations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goal_simulations").select("user_id");
      if (error) return [];
      return data || [];
    },
  });

  const headers = ["Usuário", "Email", "Status", "Total Snapshots", "Total Simulações"];
  const rows = users.map((u) => {
    const snaps = snapshots.filter((s: any) => s.user_id === u.id).length;
    const sims = simulations.filter((s: any) => s.user_id === u.id).length;
    return [u.full_name || "", u.email, u.subscription_status, String(snaps), String(sims)];
  });

  return (
    <Card className="bg-white">
      <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Exportar Métricas de Engajamento</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button className="bg-[#3D1520] hover:bg-[#4d2030] text-white" onClick={() => { downloadCSV(`raiox_engajamento_${today()}.csv`, headers, rows); toast.success("CSV exportado!"); }}>
          <Download className="h-4 w-4 mr-1" /> Exportar Engajamento (CSV)
        </Button>
        <PreviewTable headers={headers} rows={rows} />
      </CardContent>
    </Card>
  );
}

// ─── Executive Report ─────────────────────────────
function ExecutiveReportSection() {
  const [report, setReport] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-export-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const generate = useCallback(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const active = users.filter((u) => u.subscription_status === "active").length;
    const newThisMonth = users.filter((u) => u.created_at && u.created_at >= monthStart).length;
    const cancelled = users.filter((u) => u.subscription_status === "cancelled").length;
    const cancelledThisMonth = users.filter(
      (u) => u.subscription_status === "cancelled" && u.updated_at && u.updated_at >= monthStart
    ).length;
    const churn = active + cancelledThisMonth > 0
      ? ((cancelledThisMonth / (active + cancelledThisMonth)) * 100).toFixed(1) : "0";
    const revenue = active * 67;

    const month = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const text = `📊 RELATÓRIO EXECUTIVO — ${month.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 Usuários Ativos: ${active}
🆕 Novos no Mês: ${newThisMonth}
❌ Total Cancelados: ${cancelled}
📉 Churn do Mês: ${churn}%
💰 Receita Estimada: R$ ${revenue.toLocaleString("pt-BR")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de Usuários Cadastrados: ${users.length}
Gerado em: ${now.toLocaleString("pt-BR")}`;

    setReport(text);
  }, [users]);

  return (
    <Card className="bg-white">
      <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Relatório Executivo</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button className="bg-[#3D1520] hover:bg-[#4d2030] text-white" onClick={generate}>
          <FileText className="h-4 w-4 mr-1" /> Gerar Relatório do Mês
        </Button>
        {report && (
          <>
            <Textarea value={report} readOnly rows={14} className="font-mono text-sm" />
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(report); toast.success("Copiado!"); }}>
              <Copy className="h-4 w-4 mr-1" /> Copiar Relatório
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────
export default function AdminExportPage() {
  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
        <UsersExportSection />
        <WebhooksExportSection />
        <EngagementExportSection />
        <Separator />
        <ExecutiveReportSection />
      </div>
    </AdminLayout>
  );
}
