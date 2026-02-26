import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Plus, Pencil, Trash2, Info, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  info: { label: "Info", color: "bg-blue-100 text-blue-700", icon: Info },
  warning: { label: "Aviso", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  success: { label: "Sucesso", color: "bg-green-100 text-green-700", icon: CheckCircle },
  update: { label: "Atualização", color: "bg-purple-100 text-purple-700", icon: Sparkles },
};

const targetLabels: Record<string, string> = {
  all: "Todos", active: "Só ativos", order_bump: "Só com order bump", inactive: "Inativos",
};

interface NotifForm {
  title: string; message: string; type: string; target: string; expires_at: string;
}

const emptyForm: NotifForm = { title: "", message: "", type: "info", target: "all", expires_at: "" };

export default function AdminNotificationsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<NotifForm>(emptyForm);

  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: readCounts = {} } = useQuery({
    queryKey: ["admin-notification-reads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_reads").select("notification_id");
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.notification_id] = (counts[r.notification_id] || 0) + 1; });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const row: any = {
        title: form.title,
        message: form.message,
        type: form.type,
        target: form.target,
        expires_at: form.expires_at || null,
      };
      if (editId) {
        const { error } = await supabase.from("notifications").update(row).eq("id", editId);
        if (error) throw error;
      } else {
        row.created_by = profile?.id;
        const { error } = await supabase.from("notifications").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Notificação atualizada!" : "Notificação criada!");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      setModalOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("notifications").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notificação excluída!");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });

  const openEdit = (n: any) => {
    setEditId(n.id);
    setForm({ title: n.title, message: n.message, type: n.type, target: n.target, expires_at: n.expires_at?.slice(0, 10) || "" });
    setModalOpen(true);
  };

  const openNew = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };

  const typeCfg = typeConfig[form.type] || typeConfig.info;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Notificação</Button>
        </div>

        <Card className="bg-white">
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-[#3D1520] text-white">Título</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Tipo</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Destino</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Ativa</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Criada em</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Lidos</TableHead>
                  <TableHead className="bg-[#3D1520] text-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma notificação criada</TableCell></TableRow>
                ) : notifications.map((n: any, i: number) => {
                  const tc = typeConfig[n.type] || typeConfig.info;
                  return (
                    <TableRow key={n.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium max-w-[200px] truncate">{n.title}</TableCell>
                      <TableCell><Badge className={tc.color}>{tc.label}</Badge></TableCell>
                      <TableCell className="text-sm">{targetLabels[n.target] || n.target}</TableCell>
                      <TableCell>
                        <Switch checked={n.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: n.id, active: v })} />
                      </TableCell>
                      <TableCell className="text-xs">{new Date(n.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-sm font-medium">{(readCounts as any)[n.id] || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(n)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => deleteMutation.mutate(n.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Editar Notificação" : "Nova Notificação"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Mensagem</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="update">Atualização</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Só ativos</SelectItem>
                    <SelectItem value="order_bump">Só com order bump</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Data de Expiração (opcional)</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>

            {/* Preview */}
            {form.title && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                <div className={`border-l-4 p-3 rounded bg-muted/30 ${form.type === "warning" ? "border-orange-500" : form.type === "success" ? "border-green-500" : form.type === "update" ? "border-purple-500" : "border-blue-500"}`}>
                  <p className="font-medium text-sm">{form.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{form.message}</p>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending}>
              {editId ? "Salvar Alterações" : "Criar Notificação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
