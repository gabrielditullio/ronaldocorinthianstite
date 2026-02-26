import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LeadModal } from "@/components/funnel/LeadModal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, ArrowRight, AlertTriangle, GripVertical, Calendar, User, DollarSign } from "lucide-react";
import { PageSkeleton, EmptyState } from "@/components/ui/page-states";
import { toast } from "sonner";
import type { Lead, LeadFormData } from "@/components/funnel/types";
import { formatBRL, daysInStage } from "@/components/funnel/types";

const PIPELINE_COLUMNS = [
  { key: "lead", label: "TOTAL LEADS", bgClass: "bg-muted/40", borderClass: "border-l-muted-foreground/40", badgeBg: "bg-muted text-muted-foreground" },
  { key: "qualification", label: "EM QUALIFICAÇÃO", bgClass: "bg-blue-50", borderClass: "border-l-blue-400", badgeBg: "bg-blue-100 text-blue-800" },
  { key: "meeting", label: "AGENDADOS", bgClass: "bg-yellow-50", borderClass: "border-l-yellow-400", badgeBg: "bg-yellow-100 text-yellow-800" },
  { key: "closed", label: "REUNIÃO REALIZADA", bgClass: "bg-green-50", borderClass: "border-l-green-500", badgeBg: "bg-green-100 text-green-800" },
] as const;

function getColumnKey(stage: string): string {
  if (stage === "proposal" || stage === "closed_won" || stage === "closed_lost") return "closed";
  return stage;
}

export default function PipelinePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [filterSeller, setFilterSeller] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("id, name, role").eq("is_active", true).order("name");
      if (error) throw error;
      return data as { id: string; name: string; role: string }[];
    },
    enabled: !!user,
  });

  const memberMap = useMemo(() => {
    const m: Record<string, string> = {};
    teamMembers.forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [teamMembers]);

  const saveMutation = useMutation({
    mutationFn: async ({ id, ...formData }: LeadFormData & { id?: string }) => {
      if (id) {
        const existing = leads.find((l) => l.id === id);
        const updates: Record<string, unknown> = { ...formData };
        if (existing && existing.stage !== formData.stage) {
          updates.previous_stage = existing.stage;
          updates.stage_changed_at = new Date().toISOString();
        }
        const { error } = await supabase.from("leads").update(updates).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leads").insert({
          ...formData, user_id: user!.id, stage_changed_at: new Date().toISOString(),
        });
        if (error) throw error;
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
        stage: newStage, previous_stage: oldStage, stage_changed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
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
    if (filterSeller) result = result.filter((l) => l.assigned_to === filterSeller);
    if (filterFrom) result = result.filter((l) => l.created_at && l.created_at >= filterFrom);
    if (filterTo) result = result.filter((l) => l.created_at && l.created_at <= filterTo + "T23:59:59");
    return result;
  }, [leads, filterSeller, filterFrom, filterTo]);

  const columnLeads = useMemo(() => {
    const map: Record<string, Lead[]> = { lead: [], qualification: [], meeting: [], closed: [] };
    filtered.forEach((l) => {
      const col = getColumnKey(l.stage);
      if (map[col]) map[col].push(l);
    });
    return map;
  }, [filtered]);

  // Conversion rates between adjacent columns
  const conversionRates = useMemo(() => {
    const cols = ["lead", "qualification", "meeting", "closed"];
    const rates: (number | null)[] = [];
    for (let i = 0; i < cols.length - 1; i++) {
      const from = columnLeads[cols[i]].length;
      const to = columnLeads[cols[i + 1]].length;
      rates.push(from > 0 ? Math.round((to / from) * 100) : null);
    }
    return rates;
  }, [columnLeads]);

  // Drag & drop handlers
  const handleDragStart = useCallback((id: string) => setDragId(id), []);
  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  const handleDrop = useCallback((columnKey: string) => {
    if (!dragId) return;
    const lead = leads.find((l) => l.id === dragId);
    if (!lead) return;
    // Map column key to actual stage
    const stageMap: Record<string, string> = { lead: "lead", qualification: "qualification", meeting: "meeting", closed: "proposal" };
    const newStage = stageMap[columnKey] || columnKey;
    if (lead.stage !== newStage) {
      stageMutation.mutate({ id: dragId, newStage, oldStage: lead.stage });
    }
    setDragId(null);
  }, [dragId, leads, stageMutation]);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const renderCard = (lead: Lead, colKey: string) => {
    const days = daysInStage(lead.stage_changed_at);
    const isStale = days > 15 && !lead.stage.startsWith("closed");
    const col = PIPELINE_COLUMNS.find((c) => c.key === colKey)!;

    return (
      <Card
        key={lead.id}
        draggable
        onDragStart={() => handleDragStart(lead.id)}
        className={`cursor-grab active:cursor-grabbing border-l-4 ${col.borderClass} transition-all hover:shadow-md group`}
        onClick={() => openEdit(lead)}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm leading-tight truncate">{lead.name}</p>
              {lead.company && <p className="text-xs text-muted-foreground truncate">{lead.company}</p>}
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
          </div>

          {colKey === "lead" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(lead.created_at)}</span>
              {isStale && (
                <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                  <AlertTriangle className="mr-0.5 h-3 w-3" />{days}d
                </Badge>
              )}
            </div>
          )}

          {colKey === "qualification" && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{days}d nesta etapa</span>
                {isStale && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    <AlertTriangle className="mr-0.5 h-3 w-3" />Atrasado
                  </Badge>
                )}
              </div>
            </>
          )}

          {colKey === "meeting" && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(lead.stage_changed_at)}</span>
              </div>
              {lead.assigned_to && memberMap[lead.assigned_to] && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{memberMap[lead.assigned_to]}</span>
                </div>
              )}
            </>
          )}

          {colKey === "closed" && (
            <>
              <div className="flex items-center gap-1.5 text-xs">
                {lead.stage === "closed_won" && (
                  <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">Venda ✓</Badge>
                )}
                {lead.stage === "closed_lost" && (
                  <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">Perdido</Badge>
                )}
                {lead.stage === "proposal" && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px]">Proposta</Badge>
                )}
              </div>
              {lead.proposal_value && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                  <DollarSign className="h-3 w-3" />
                  {formatBRL(lead.proposal_value)}
                </div>
              )}
            </>
          )}

          {lead.assigned_to && memberMap[lead.assigned_to] && colKey !== "meeting" && (
            <p className="text-xs text-muted-foreground truncate">👤 {memberMap[lead.assigned_to]}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
            <p className="text-muted-foreground">Visão Kanban do seu funil comercial</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterSeller || "all"} onValueChange={(v) => setFilterSeller(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48 h-9 bg-background">
              <SelectValue placeholder="Filtrar por vendedor" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" className="h-9 w-40" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} placeholder="De" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" className="h-9 w-40" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} placeholder="Até" />
          </div>
          {(filterSeller || filterFrom || filterTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterSeller(""); setFilterFrom(""); setFilterTo(""); }}>
              Limpar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <PageSkeleton rows={3} />
        ) : leads.length === 0 ? (
          <EmptyState
            icon={GripVertical}
            title="Nenhum lead este mês"
            description="Adicione leads para visualizar seu pipeline de vendas."
            actionLabel="Adicionar Lead"
            onAction={openNew}
          />
        ) : (
          <>
            {/* Kanban Board */}
            <div className="flex gap-2 overflow-x-auto pb-4">
              {PIPELINE_COLUMNS.map((col, colIdx) => {
                const colLeadsList = columnLeads[col.key];
                return (
                  <div key={col.key} className="flex items-start gap-0">
                    <div
                      className="min-w-[280px] flex-1"
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(col.key)}
                    >
                      {/* Column Header */}
                      <div className={`mb-2 flex items-center justify-between rounded-lg px-3 py-2.5 ${col.bgClass} border`}>
                        <span className="text-xs font-bold tracking-wide">{col.label}</span>
                        <Badge className={`${col.badgeBg} text-xs font-bold`}>{colLeadsList.length}</Badge>
                      </div>

                      {/* Cards */}
                      <div className="space-y-2 min-h-[120px]">
                        {colLeadsList.map((lead) => renderCard(lead, col.key))}
                        {colLeadsList.length === 0 && (
                          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                            Nenhum lead
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conversion arrow between columns */}
                    {colIdx < PIPELINE_COLUMNS.length - 1 && (
                      <div className="flex flex-col items-center justify-start pt-2.5 px-1 shrink-0">
                        <div className="flex flex-col items-center gap-0.5">
                          <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                          {conversionRates[colIdx] !== null && (
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {conversionRates[colIdx]}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
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
