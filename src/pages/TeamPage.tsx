import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  monthly_lead_goal: number | null;
  monthly_revenue_goal: number | null;
  is_active: boolean | null;
}

interface FormData {
  name: string;
  role: string;
  email: string;
  phone: string;
  monthly_lead_goal: number;
  monthly_revenue_goal: number;
  monthly_scheduling_goal: number;
}

const defaultForm: FormData = {
  name: "",
  role: "sdr",
  email: "",
  phone: "",
  monthly_lead_goal: 25,
  monthly_revenue_goal: 100000,
  monthly_scheduling_goal: 0
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "");
  return Number(cleaned) || 0;
}

export default function TeamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [tab, setTab] = useState("all");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase.
      from("team_members").
      select("*").
      order("name");
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!user
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: {id?: string;} & FormData) => {
      const payload = {
        name: data.name.trim(),
        role: data.role,
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        monthly_lead_goal: data.monthly_lead_goal,
        monthly_revenue_goal: data.monthly_revenue_goal,
        monthly_scheduling_goal: data.monthly_scheduling_goal,
        user_id: user!.id
      };
      if (data.id) {
        const { error } = await supabase.from("team_members").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_members").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast.success(editingId ? "Membro atualizado!" : "Membro adicionado!");
      closeModal();
    },
    onError: () => toast.error("Erro ao salvar membro.")
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: {id: string;is_active: boolean;}) => {
      const { error } = await supabase.from("team_members").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team_members"] }),
    onError: () => toast.error("Erro ao atualizar status.")
  });

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const openEdit = (m: TeamMember) => {
    setForm({
      name: m.name,
      role: m.role.toLowerCase(),
      email: m.email || "",
      phone: m.phone || "",
      monthly_lead_goal: m.monthly_lead_goal ?? 25,
      monthly_revenue_goal: m.monthly_revenue_goal ?? 100000
    });
    setEditingId(m.id);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role) return;
    upsertMutation.mutate({ ...form, id: editingId ?? undefined });
  };

  const filtered = tab === "all" ? members : members.filter((m) => m.role.toLowerCase() === tab);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meu Time</h1>
            <p className="text-muted-foreground">Gerencie seus SDRs e Closers</p>
          </div>
          <Button onClick={() => {setForm(defaultForm);setEditingId(null);setOpen(true);}}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Membro
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Todos ({members.length})</TabsTrigger>
            <TabsTrigger value="sdr">SDRs ({members.filter((m) => m.role.toLowerCase() === "sdr").length})</TabsTrigger>
            <TabsTrigger value="closer">Closers ({members.filter((m) => m.role.toLowerCase() === "closer").length})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ?
            <div className="space-y-3 animate-fade-in">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />)}
              </div> :
            filtered.length === 0 ?
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">Nenhum membro encontrado</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adicione seu primeiro membro do time para começar
                  </p>
                </CardContent>
              </Card> :

            <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Telefone</TableHead>
                        <TableHead>Meta Mensal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((m) =>
                    <TableRow key={m.id} className={m.is_active === false ? "opacity-50" : ""}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell>
                            <Badge variant={m.role.toLowerCase() === "sdr" ? "default" : "secondary"} className={m.role.toLowerCase() === "sdr" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}>
                              {m.role.toUpperCase() === "SDR" ? "SDR" : "Closer"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{m.email || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{m.phone || "—"}</TableCell>
                          <TableCell>
                            {m.role.toLowerCase() === "sdr" ?
                        `${m.monthly_lead_goal ?? 0} leads` :
                        formatCurrency(m.monthly_revenue_goal ?? 0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`inline-block h-2 w-2 rounded-full ${m.is_active !== false ? "bg-success" : "bg-muted-foreground/40"}`} />
                              <Switch
                            checked={m.is_active !== false}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: m.id, is_active: checked })}
                            className="scale-75" />

                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            }
          </TabsContent>
        </Tabs>

        {/* Add/Edit Modal */}
        <Dialog open={open} onOpenChange={(v) => {if (!v) closeModal();else setOpen(true);}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nome do membro" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sdr">SDR</SelectItem>
                    <SelectItem value="closer">Closer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
              </div>
              {form.role === "sdr" ?
              <div className="space-y-2">
                  <Label htmlFor="leadGoal">Meta mensal de leads</Label>
                  <Input id="leadGoal" type="number" min={0} value={form.monthly_lead_goal} onChange={(e) => setForm({ ...form, monthly_lead_goal: Number(e.target.value) || 0 })} />
                </div> :

              <div className="space-y-2">
                  <Label htmlFor="revenueGoal">Meta mensal de receita (R$)</Label>
                  <Input id="revenueGoal" value={formatCurrency(form.monthly_revenue_goal)} onChange={(e) => setForm({ ...form, monthly_revenue_goal: parseCurrencyInput(e.target.value) })} />
                </div>
              }
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>);

}