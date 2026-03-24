import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { Users, UserCheck, UserX, Search, ChevronLeft, ChevronRight, ArrowUpDown, KeyRound } from "lucide-react";

type SortKey = "email" | "full_name" | "company_name" | "subscription_status" | "created_at";

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: "activate" | "deactivate" } | null>(null);

  const PER_PAGE = 10;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.is_admin,
  });

  const mutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "activate" | "deactivate" }) => {
      const { data, error } = await supabase.functions.invoke("admin-update-subscription", {
        body: { target_user_id: userId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("Erro ao atualizar status."),
  });

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email?.toLowerCase().includes(s) ||
          u.full_name?.toLowerCase().includes(s)
      );
    }
    list = [...list].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? "";
      const bVal = (b as any)[sortKey] ?? "";
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, sortKey, sortAsc]);

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.subscription_status === "active").length;
    return { total: users.length, active, inactive: users.length - active };
  }, [users]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  if (loading) return null;
  if (!profile?.is_admin) return <Navigate to="/dashboard" replace />;

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge className="bg-green-600 hover:bg-green-700 text-white">Ativo</Badge>;
    if (status === "cancelled") return <Badge variant="destructive">Cancelado</Badge>;
    return <Badge variant="secondary">Inativo</Badge>;
  };

  const SortHeader = ({ label, colKey }: { label: string; colKey: SortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(colKey)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3" /></span>
    </TableHead>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Painel Admin</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Total de Usuários</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><UserCheck className="h-4 w-4" /> Ativos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{stats.active}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><UserX className="h-4 w-4" /> Inativos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p></CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por email ou nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Email" colKey="email" />
                  <SortHeader label="Nome" colKey="full_name" />
                  <SortHeader label="Empresa" colKey="company_name" />
                  <SortHeader label="Status" colKey="subscription_status" />
                  <TableHead>Ativado em</TableHead>
                  <TableHead>Transação</TableHead>
                  <TableHead>Bump</TableHead>
                  <SortHeader label="Criado em" colKey="created_at" />
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                ) : (
                  paged.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell>{u.full_name || "—"}</TableCell>
                      <TableCell>{u.company_name || "—"}</TableCell>
                      <TableCell>{statusBadge(u.subscription_status)}</TableCell>
                      <TableCell className="text-xs">
                        {u.subscription_activated_at ? new Date(u.subscription_activated_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{u.hotmart_transaction_id || "—"}</TableCell>
                      <TableCell>{u.has_order_bump ? "Sim" : "Não"}</TableCell>
                      <TableCell className="text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>
                        {u.subscription_status === "active" ? (
                          <Button size="sm" variant="outline" onClick={() => setConfirmAction({ userId: u.id, action: "deactivate" })}>
                            Desativar
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setConfirmAction({ userId: u.id, action: "activate" })}>
                            Ativar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
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

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "activate" ? "Ativar assinatura?" : "Desativar assinatura?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "activate"
                ? "O usuário terá acesso completo à plataforma."
                : "O usuário perderá acesso às funcionalidades."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) {
                  mutation.mutate({ userId: confirmAction.userId, action: confirmAction.action });
                }
                setConfirmAction(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
