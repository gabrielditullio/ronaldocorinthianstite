import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search, ChevronLeft, ChevronRight, Copy, AlertTriangle, CheckCircle2, XCircle, Webhook, Clock, Activity,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

const PER_PAGE = 50;

const eventConfig: Record<string, { label: string; className: string }> = {
  approved_purchase: { label: "approved_purchase", className: "bg-green-600 hover:bg-green-700 text-white" },
  refunded_purchase: { label: "refunded_purchase", className: "bg-orange-500 hover:bg-orange-600 text-white" },
  chargeback: { label: "chargeback", className: "bg-red-600 hover:bg-red-700 text-white" },
};

function extractEmail(payload: any): string {
  try {
    return payload?.data?.client?.email || payload?.email || payload?.buyer?.email || "—";
  } catch { return "—"; }
}

function extractEvent(payload: any): string {
  try {
    return payload?.event || payload?.type || "unknown";
  } catch { return "unknown"; }
}

function hasError(log: any): boolean {
  // Simple heuristic: if payload contains error or status >= 400
  const p = log.payload;
  if (p?.error || p?.status === "error") return true;
  return false;
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AdminWebhooksPage() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [periodToggle, setPeriodToggle] = useState<"today" | "week" | "month">("week");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-webhook-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let list = logs;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((l) => extractEmail(l.payload).toLowerCase().includes(s));
    }
    if (eventFilter !== "all") {
      list = list.filter((l) => extractEvent(l.payload) === eventFilter);
    }
    if (statusFilter === "success") list = list.filter((l) => !hasError(l));
    if (statusFilter === "error") list = list.filter((l) => hasError(l));
    if (dateFrom) list = list.filter((l) => l.created_at && l.created_at >= dateFrom);
    if (dateTo) list = list.filter((l) => l.created_at && l.created_at <= dateTo + "T23:59:59");
    return list;
  }, [logs, search, eventFilter, statusFilter, dateFrom, dateTo]);

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const h24 = new Date(now.getTime() - 86400000).toISOString();

    const periodStart = periodToggle === "today" ? todayStart : periodToggle === "week" ? weekStart : monthStart;
    const periodLogs = logs.filter((l) => l.created_at && l.created_at >= periodStart);

    const errors24h = logs.filter((l) => l.created_at && l.created_at >= h24 && hasError(l)).length;
    const totalErrors = periodLogs.filter((l) => hasError(l)).length;
    const successRate = periodLogs.length > 0 ? (((periodLogs.length - totalErrors) / periodLogs.length) * 100).toFixed(1) : "0";

    const lastLog = logs[0];
    return {
      total: periodLogs.length,
      successRate,
      errors24h,
      lastLogTime: lastLog?.created_at ? formatDate(lastLog.created_at) : "—",
      lastLogEvent: lastLog ? extractEvent(lastLog.payload) : "—",
    };
  }, [logs, periodToggle]);

  const eventBadge = (event: string) => {
    const cfg = eventConfig[event];
    if (cfg) return <Badge className={cfg.className}>{cfg.label}</Badge>;
    return <Badge variant="secondary">{event}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>

        {/* Warning banner */}
        {stats.errors24h > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ {stats.errors24h} webhooks com erro nas últimas 24h. Verifique a integração com Assiny.
            </AlertDescription>
          </Alert>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
                <Webhook className="h-4 w-4" /> Total de Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
              <div className="flex gap-1 mt-1">
                {(["today", "week", "month"] as const).map((p) => (
                  <Button key={p} size="sm" variant={periodToggle === p ? "default" : "ghost"} className="h-6 text-[10px] px-2"
                    onClick={() => setPeriodToggle(p)}>
                    {p === "today" ? "Hoje" : p === "week" ? "Semana" : "Mês"}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Último Webhook</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{stats.lastLogTime}</p>
              <p className="text-xs text-muted-foreground">{stats.lastLogEvent}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Taxa de Sucesso</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{stats.successRate}%</p></CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Erros (24h)</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${stats.errors24h > 0 ? "text-red-600" : "text-muted-foreground"}`}>{stats.errors24h}</p></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved_purchase">approved_purchase</SelectItem>
              <SelectItem value="refunded_purchase">refunded_purchase</SelectItem>
              <SelectItem value="chargeback">chargeback</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} />
          <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} />
        </div>

        {/* Table */}
        <Card className="bg-white">
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-[#3D1520] text-white">Data/Hora</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Evento</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Email</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Status</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum webhook encontrado</TableCell></TableRow>
                ) : (
                  paged.map((log, i) => (
                    <TableRow key={log.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                      <TableCell className="text-xs whitespace-nowrap">{log.created_at ? formatDate(log.created_at) : "—"}</TableCell>
                      <TableCell>{eventBadge(extractEvent(log.payload))}</TableCell>
                      <TableCell className="text-xs">{extractEmail(log.payload)}</TableCell>
                      <TableCell>
                        {hasError(log)
                          ? <XCircle className="h-4 w-4 text-red-500" />
                          : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelectedLog(log)}>
                          Ver Payload
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Exibindo {filtered.length > 0 ? page * PER_PAGE + 1 : 0}-{Math.min((page + 1) * PER_PAGE, filtered.length)} de {filtered.length}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>

      {/* Payload Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payload do Webhook</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Key fields */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground font-medium">Evento</span>
                <span>{eventBadge(extractEvent(selectedLog.payload))}</span>
                <span className="text-muted-foreground font-medium">Email</span>
                <span>{extractEmail(selectedLog.payload)}</span>
                <span className="text-muted-foreground font-medium">Transaction ID</span>
                <span className="text-xs">{selectedLog.payload?.data?.transaction?.id || selectedLog.payload?.transaction_id || "—"}</span>
                <span className="text-muted-foreground font-medium">Recebido em</span>
                <span className="text-xs">{selectedLog.created_at ? formatDate(selectedLog.created_at) : "—"}</span>
              </div>

              {/* Headers */}
              {selectedLog.headers && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Headers</h4>
                  <pre className="bg-muted rounded p-3 text-[11px] overflow-x-auto whitespace-pre-wrap break-all max-h-[150px]">
                    {JSON.stringify(selectedLog.headers, null, 2)}
                  </pre>
                </div>
              )}

              {/* Full payload */}
              <div>
                <h4 className="text-sm font-semibold mb-1">Payload</h4>
                <pre className="bg-muted rounded p-3 text-[11px] overflow-x-auto whitespace-pre-wrap break-all max-h-[300px]">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>

              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(selectedLog.payload, null, 2));
                toast.success("Payload copiado!");
              }}>
                <Copy className="h-4 w-4 mr-1" /> Copiar Payload
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
