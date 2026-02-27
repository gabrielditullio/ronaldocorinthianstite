import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FunnelSummary } from "@/components/funnel/FunnelSummary";
import { FunnelFilters } from "@/components/funnel/FunnelFilters";
import { FunnelKanban } from "@/components/funnel/FunnelKanban";
import { FunnelTable } from "@/components/funnel/FunnelTable";
import { LeadModal } from "@/components/funnel/LeadModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Kanban, TableIcon, Filter } from "lucide-react";
import { PageSkeleton, EmptyState } from "@/components/ui/page-states";
import { toast } from "sonner";
import { trackStageTransition } from "@/lib/track-stage-transition";
import type { Lead, LeadFormData, Filters } from "@/components/funnel/types";

const emptyFilters: Filters = { assignedTo: "", source: "", stages: [], dateFrom: "", dateTo: "" };

export default function FunnelPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, role")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; role: string }[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, ...formData }: LeadFormData & { id?: string }) => {
      if (id) {
        const existing = leads.find((l) => l.id === id);
        const updates: Record<string, unknown> = { ...formData };
        if (existing && existing.stage !== formData.stage) {
          updates.previous_stage = existing.stage;
          updates.stage_changed_at = new Date().toISOString();
          // Track transition
          await trackStageTransition(user!.id, id, existing.stage, formData.stage);
        }
        const { error } = await supabase.from("leads").update(updates).eq("id", id);
        if (error) throw error;
      } else {
        const { data: newLead, error } = await supabase.from("leads").insert({
          ...formData,
          user_id: user!.id,
          stage_changed_at: new Date().toISOString(),
        }).select("id").single();
        if (error) throw error;
        // Track initial stage
        await trackStageTransition(user!.id, newLead.id, null, formData.stage || "lead");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(editingLead ? "Lead atualizado!" : "Lead adicionado!");
      closeModal();
    },
    onError: () => toast.error("Erro ao salvar lead."),
  });

  const stageMutation = useMutation({
    mutationFn: async ({ id, newStage, oldStage }: { id: string; newStage: string; oldStage: string }) => {
      const { error } = await supabase.from("leads").update({
        stage: newStage,
        previous_stage: oldStage,
        stage_changed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      await trackStageTransition(user!.id, id, oldStage, newStage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Etapa atualizada!");
    },
    onError: () => toast.error("Erro ao mover lead."),
  });

  const closeModal = () => { setModalOpen(false); setEditingLead(null); };
  const openNew = () => { setEditingLead(null); setModalOpen(true); };
  const openEdit = (lead: Lead) => { setEditingLead(lead); setModalOpen(true); };

  const filtered = useMemo(() => {
    let result = leads;
    if (filters.assignedTo) result = result.filter((l) => l.assigned_to === filters.assignedTo);
    if (filters.source) result = result.filter((l) => l.lead_source === filters.source);
    if (filters.stages.length > 0) result = result.filter((l) => filters.stages.includes(l.stage));
    if (filters.dateFrom) result = result.filter((l) => l.created_at && l.created_at >= filters.dateFrom);
    if (filters.dateTo) result = result.filter((l) => l.created_at && l.created_at <= filters.dateTo + "T23:59:59");
    return result;
  }, [leads, filters]);

  const handleStageChange = (id: string, newStage: string) => {
    const lead = leads.find((l) => l.id === id);
    if (lead && lead.stage !== newStage) {
      stageMutation.mutate({ id, newStage, oldStage: lead.stage });
    }
  };

  const memberMap = useMemo(() => {
    const m: Record<string, string> = {};
    teamMembers.forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [teamMembers]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Funil de Vendas</h1>
            <p className="text-muted-foreground">Acompanhe seus leads pelo pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "table")}>
              <TabsList className="h-9">
                <TabsTrigger value="kanban" className="px-3"><Kanban className="mr-1 h-4 w-4" />Kanban</TabsTrigger>
                <TabsTrigger value="table" className="px-3"><TableIcon className="mr-1 h-4 w-4" />Tabela</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Novo Lead
            </Button>
          </div>
        </div>

        <FunnelSummary leads={filtered} />
        <FunnelFilters filters={filters} setFilters={setFilters} teamMembers={teamMembers} />

        {isLoading ? (
          <PageSkeleton rows={3} />
        ) : filtered.length === 0 && leads.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Nenhum lead cadastrado"
            description="Clique em 'Novo Lead' para começar a preencher seu funil de vendas."
            actionLabel="Novo Lead"
            actionTo="/funnel"
          />
        ) : view === "kanban" ? (
          <FunnelKanban leads={filtered} memberMap={memberMap} onEdit={openEdit} onStageChange={handleStageChange} />
        ) : (
          <FunnelTable leads={filtered} memberMap={memberMap} onEdit={openEdit} />
        )}

        <LeadModal
          open={modalOpen}
          onClose={closeModal}
          lead={editingLead}
          teamMembers={teamMembers}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
