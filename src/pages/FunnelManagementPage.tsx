import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFunnel, Funnel } from "@/contexts/FunnelContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Archive, CheckCircle2 } from "lucide-react";
import { funnelTypeLabels, funnelTypeColors } from "@/utils/translations";

export default function FunnelManagementPage() {
  const { user } = useAuth();
  const { funnels, selectedFunnelId, setSelectedFunnelId, refetchFunnels } = useFunnel();
  const [showModal, setShowModal] = useState(false);
  const [editFunnel, setEditFunnel] = useState<Funnel | null>(null);
  const [name, setName] = useState("");
  const [funnelType, setFunnelType] = useState("high_ticket");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Quick stats per funnel
  const { data: statsMap = {} } = useQuery({
    queryKey: ["funnel-stats", user?.id],
    queryFn: async () => {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const startDate = `${monthYear}-01`;
      const endDate = `${monthYear}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

      const [leadsRes, snapRes] = await Promise.all([
        supabase.from("leads").select("funnel_id, id").eq("user_id", user!.id).gte("created_at", startDate).lte("created_at", endDate + "T23:59:59"),
        supabase.from("monthly_snapshots").select("funnel_id, total_revenue").eq("user_id", user!.id).eq("month_year", monthYear),
      ]);

      const stats: Record<string, { leads: number; revenue: number }> = {};
      (leadsRes.data || []).forEach((l: any) => {
        const fid = l.funnel_id || "none";
        if (!stats[fid]) stats[fid] = { leads: 0, revenue: 0 };
        stats[fid].leads++;
      });
      (snapRes.data || []).forEach((s: any) => {
        const fid = s.funnel_id || "none";
        if (!stats[fid]) stats[fid] = { leads: 0, revenue: 0 };
        stats[fid].revenue += Number(s.total_revenue) || 0;
      });
      return stats;
    },
    enabled: !!user,
  });

  const openCreate = () => {
    setEditFunnel(null);
    setName("");
    setFunnelType("high_ticket");
    setDescription("");
    setShowModal(true);
  };

  const openEdit = (f: Funnel) => {
    setEditFunnel(f);
    setName(f.name);
    setFunnelType(f.funnel_type);
    setDescription(f.description || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome do funil"); return; }
    setSaving(true);
    try {
      if (editFunnel) {
        const { error } = await supabase.from("funnels").update({ name: name.trim(), funnel_type: funnelType, description: description.trim() || null }).eq("id", editFunnel.id);
        if (error) throw error;
        toast.success("Funil atualizado!");
      } else {
        const { error } = await supabase.from("funnels").insert({ user_id: user!.id, name: name.trim(), funnel_type: funnelType, description: description.trim() || null });
        if (error) throw error;
        toast.success("Funil criado!");
      }
      refetchFunnels();
      setShowModal(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar funil");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (f: Funnel) => {
    const { error } = await supabase.from("funnels").update({ is_active: false }).eq("id", f.id);
    if (error) { toast.error("Erro ao arquivar"); return; }
    toast.success("Funil arquivado");
    if (selectedFunnelId === f.id) setSelectedFunnelId(null);
    refetchFunnels();
  };

  const fmtBrl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Funis</h1>
            <p className="text-muted-foreground">Crie e organize seus funis de venda</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Funil</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funnels.map((f) => {
            const s = statsMap[f.id] || { leads: 0, revenue: 0 };
            const isSelected = selectedFunnelId === f.id;
            return (
              <Card key={f.id} className={`transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{f.name}</h3>
                      {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                    </div>
                    <Badge className={funnelTypeColors[f.funnel_type] || "bg-muted text-muted-foreground"}>
                      {funnelTypeLabels[f.funnel_type] || f.funnel_type}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div><span className="text-muted-foreground">Leads:</span> <span className="font-medium">{s.leads}</span></div>
                    <div><span className="text-muted-foreground">Receita:</span> <span className="font-medium">{fmtBrl(s.revenue)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={isSelected ? "default" : "outline"} onClick={() => setSelectedFunnelId(f.id)} className="flex-1">
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                      {isSelected ? "Selecionado" : "Selecionar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(f)}><Archive className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {funnels.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <p>Nenhum funil encontrado. Crie seu primeiro funil!</p>
          </CardContent></Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editFunnel ? "Editar Funil" : "Novo Funil"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Funil</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: High Ticket Principal" />
            </div>
            <div>
              <Label>Tipo de Funil</Label>
              <Select value={funnelType} onValueChange={setFunnelType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(funnelTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o propósito deste funil..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editFunnel ? "Salvar" : "Criar Funil"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
