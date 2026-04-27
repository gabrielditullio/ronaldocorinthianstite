import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  Search, ChevronLeft, ChevronRight, ArrowUpDown, Check, X, Download, Eye, KeyRound,
} from "lucide-react";

type SortKey = "email" | "full_name" | "subscription_status" | "created_at";

const PER_PAGE = 20;

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-green-600 hover:bg-green-700 text-white" },
  cancelled: { label: "Cancelado", className: "bg-red-600 hover:bg-red-700 text-white" },
  expired: { label: "Expirado", className: "bg-gray-500 hover:bg-gray-600 text-white" },
  trial: { label: "Trial", className: "bg-blue-600 hover:bg-blue-700 text-white" },
  inactive: { label: "Inativo", className: "bg-gray-400 hover:bg-gray-500 text-white" },
};

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: "activate" | "deactivate" } | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<{ userId: string; email: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Webhook logs for the detail drawer
  const { data: webhookLogs = [] } = useQuery({
    queryKey: ["admin-webhook-logs", detailUserId],
    queryFn: async () => {
      if (!detailUserId) return [];
      const detailUser = users.find((u) => u.id === detailUserId);
      if (!detailUser?.email) return [];
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      // Filter by user email in payload
      return (data || []).filter((log) => {
        const payload = JSON.stringify(log.payload || "");
        return payload.toLowerCase().includes(detailUser.email.toLowerCase());
      });
    },
    enabled: !!detailUserId,
  });

  // Admin action logs for the detail drawer
  const { data: actionLogs = [] } = useQuery({
    queryKey: ["admin-action-logs", detailUserId],
    queryFn: async () => {
      if (!detailUserId) return [];
      const { data, error } = await supabase
        .from("admin_action_logs")
        .select("*")
        .eq("target_user_id", detailUserId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return data || [];
    },
    enabled: !!detailUserId,
  });

  const mutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "activate" | "deactivate" }) => {
      const { data, error } = await supabase.functions.invoke("admin-update-subscription", {
        body: { target_user_id: userId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Log the action
      if (profile?.id) {
        await supabase.from("admin_action_logs").insert({
          admin_user_id: profile.id,
          target_user_id: userId,
          action,
        });
      }
    },
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-action-logs"] });
    },
    onError: () => toast.error("Erro ao atualizar status."),
  });

  const sendPasswordReset = async (userId: string, email: string) => {
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      if (profile?.id) {
        await supabase.from("admin_action_logs").insert({
          admin_user_id: profile.id,
          target_user_id: userId,
          action: "password_reset_sent",
        });
        queryClient.invalidateQueries({ queryKey: ["admin-action-logs"] });
      }
      toast.success(`Email de redefinição enviado para ${email}`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar email de redefinição.");
    } finally {
      setResetLoading(false);
      setResetEmail(null);
    }
  };

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (u) => u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((u) => u.subscription_status === statusFilter);
    }
    if (dateFrom) {
      list = list.filter((u) => u.created_at && u.created_at >= dateFrom);
    }
    if (dateTo) {
      const toEnd = dateTo + "T23:59:59";
      list = list.filter((u) => u.created_at && u.created_at <= toEnd);
    }
    list = [...list].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? "";
      const bVal = (b as any)[sortKey] ?? "";
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, statusFilter, dateFrom, dateTo, sortKey, sortAsc]);

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const rangeStart = page * PER_PAGE + 1;
  const rangeEnd = Math.min((page + 1) * PER_PAGE, filtered.length);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const exportCSV = useCallback(() => {
    const headers = ["Nome", "Email", "Status", "Data Cadastro", "Order Bump", "Empresa"];
    const rows = filtered.map((u) => [
      u.full_name || "",
      u.email,
      u.subscription_status,
      u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "",
      u.has_order_bump ? "Sim" : "Não",
      u.company_name || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const statusBadge = (status: string) => {
    const cfg = statusConfig[status] || statusConfig.inactive;
    return <Badge className={cfg.className}>{cfg.label}</Badge>;
  };

  const SortHeader = ({ label, colKey }: { label: string; colKey: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none bg-[#3D1520] text-white hover:bg-[#4d2030]"
      onClick={() => toggleSort(colKey)}
    >
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3" /></span>
    </TableHead>
  );

  const detailUser = detailUserId ? users.find((u) => u.id === detailUserId) : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por email ou nome..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} placeholder="De" />
          <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} placeholder="Até" />
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-white">
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Nome" colKey="full_name" />
                  <SortHeader label="Email" colKey="email" />
                  <SortHeader label="Status" colKey="subscription_status" />
                  <SortHeader label="Data Cadastro" colKey="created_at" />
                  <TableHead className="bg-[#3D1520] text-white">Order Bump</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                ) : (
                  paged.map((u, i) => (
                    <TableRow key={u.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell>{statusBadge(u.subscription_status)}</TableCell>
                      <TableCell className="text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell>
                        {u.has_order_bump
                          ? <Check className="h-4 w-4 text-green-600" />
                          : <X className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {u.subscription_status === "active" ? (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setConfirmAction({ userId: u.id, action: "deactivate" })}>
                              Desativar
                            </Button>
                          ) : (
                            <Button size="sm" className="text-xs h-7" onClick={() => setConfirmAction({ userId: u.id, action: "activate" })}>
                              Ativar
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDetailUserId(u.id)}>
                            <Eye className="h-3 w-3 mr-1" /> Detalhes
                          </Button>
                        </div>
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
            Exibindo {filtered.length > 0 ? rangeStart : 0}-{rangeEnd} de {filtered.length} usuários
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.action === "activate" ? "Ativar assinatura?" : "Desativar assinatura?"}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.action === "activate" ? "O usuário terá acesso completo à plataforma." : "O usuário perderá acesso às funcionalidades."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmAction) mutation.mutate(confirmAction); setConfirmAction(null); }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Drawer */}
      <Sheet open={!!detailUserId} onOpenChange={(open) => { if (!open) setDetailUserId(null); }}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Usuário</SheetTitle>
          </SheetHeader>
          {detailUser && (
            <div className="mt-4 space-y-6">
              {/* Profile info */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Perfil</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Nome</span><span>{detailUser.full_name || "—"}</span>
                  <span className="text-muted-foreground">Email</span><span className="break-all">{detailUser.email}</span>
                  <span className="text-muted-foreground">Empresa</span><span>{detailUser.company_name || "—"}</span>
                  <span className="text-muted-foreground">Telefone</span><span>{detailUser.phone || "—"}</span>
                  <span className="text-muted-foreground">Status</span><span>{statusBadge(detailUser.subscription_status)}</span>
                  <span className="text-muted-foreground">Order Bump</span><span>{detailUser.has_order_bump ? "Sim" : "Não"}</span>
                  <span className="text-muted-foreground">Transação</span><span className="text-xs">{detailUser.hotmart_transaction_id || "—"}</span>
                  <span className="text-muted-foreground">Ativado em</span><span className="text-xs">{detailUser.subscription_activated_at ? new Date(detailUser.subscription_activated_at).toLocaleString("pt-BR") : "—"}</span>
                  <span className="text-muted-foreground">Cadastro</span><span className="text-xs">{detailUser.created_at ? new Date(detailUser.created_at).toLocaleString("pt-BR") : "—"}</span>
                </div>
              </section>

              {/* Action buttons */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ações</h3>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {detailUser.subscription_status !== "active" ? (
                    <Button size="sm" onClick={() => { setConfirmAction({ userId: detailUser.id, action: "activate" }); }}>
                      Forçar Ativação
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setConfirmAction({ userId: detailUser.id, action: "deactivate" }); }}>
                      Forçar Desativação
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => {
                    if (profile?.id) {
                      supabase.from("admin_action_logs").insert({
                        admin_user_id: profile.id,
                        target_user_id: detailUser.id,
                        action: "resync",
                      }).then(() => {
                        toast.success("Re-sincronização registrada.");
                        queryClient.invalidateQueries({ queryKey: ["admin-action-logs"] });
                      });
                    }
                  }}>
                    Re-sincronizar
                  </Button>
                </div>
              </section>

              {/* Action Logs Timeline */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico de Ações</h3>
                <Separator />
                {actionLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {actionLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs border-l-2 border-primary/30 pl-3 py-1">
                        <div>
                          <span className="font-medium capitalize">{log.action}</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </span>
                          {log.notes && <p className="text-muted-foreground mt-0.5">{log.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Webhook Logs */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Webhooks</h3>
                <Separator />
                {webhookLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum webhook encontrado.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {webhookLogs.map((log: any) => (
                      <div key={log.id} className="text-xs border rounded p-2 bg-muted/20">
                        <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                        <pre className="mt-1 whitespace-pre-wrap break-all text-[10px]">
                          {JSON.stringify(log.payload, null, 2).slice(0, 300)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
