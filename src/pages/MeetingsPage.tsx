import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Loader2, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Action {
  description: string;
  responsible: string;
  deadline: string;
  done: boolean;
}

interface MeetingForm {
  id?: string;
  meetingDate: Date;
  weekLabel: string;
  facilitator: string;
  wins: string;
  problems: string;
  pipelineCleanup: string;
  actions: Action[];
  nextMeetingDate: string;
  nextMeetingTime: string;
  notes: string;
}

function getWeekLabel(d: Date): string {
  const s = startOfWeek(d, { weekStartsOn: 1 });
  const e = endOfWeek(d, { weekStartsOn: 1 });
  return `${format(s, "dd/MM")} - ${format(e, "dd/MM")}`;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
}

const emptyForm = (): MeetingForm => ({
  meetingDate: new Date(),
  weekLabel: getWeekLabel(new Date()),
  facilitator: "",
  wins: "",
  problems: "",
  pipelineCleanup: "",
  actions: [],
  nextMeetingDate: "",
  nextMeetingTime: "",
  notes: "",
});

export default function MeetingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MeetingForm | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["pipeline-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_meetings")
        .select("*")
        .order("meeting_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["meeting-leads-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, stage, proposal_value, updated_at");
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!editing,
  });

  const funnelSummary = useMemo(() => {
    const nonClosed = leads.filter((l) => !["closed_won", "closed_lost"].includes(l.stage));
    const stages: Record<string, number> = { lead: 0, qualification: 0, meeting: 0, proposal: 0, closed_won: 0 };
    leads.forEach((l) => { if (stages[l.stage] !== undefined) stages[l.stage]++; });
    const expectedRevenue = leads.filter((l) => l.stage === "proposal").reduce((s, l) => s + (l.proposal_value || 0), 0);
    const now = new Date();
    const atRisk = nonClosed.filter((l) => l.updated_at && differenceInDays(now, new Date(l.updated_at)) > 10);
    return { total: nonClosed.length, stages, expectedRevenue, atRisk };
  }, [leads]);

  const saveMutation = useMutation({
    mutationFn: async (form: MeetingForm) => {
      const payload = {
        user_id: user!.id,
        meeting_date: format(form.meetingDate, "yyyy-MM-dd"),
        week_label: form.weekLabel,
        facilitator: form.facilitator,
        wins: form.wins,
        problems: form.problems,
        pipeline_cleanup: form.pipelineCleanup,
        actions: JSON.stringify(form.actions),
        next_meeting_date: form.nextMeetingDate || null,
        next_meeting_time: form.nextMeetingTime || null,
        notes: form.notes,
      };
      if (form.id) {
        const { error } = await supabase.from("pipeline_meetings").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pipeline_meetings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Reunião salva!");
      qc.invalidateQueries({ queryKey: ["pipeline-meetings"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openExisting = (m: typeof meetings[0]) => {
    let actions: Action[] = [];
    try { actions = JSON.parse(m.actions || "[]"); } catch { actions = []; }
    setEditing({
      id: m.id,
      meetingDate: new Date(m.meeting_date),
      weekLabel: m.week_label || "",
      facilitator: m.facilitator || "",
      wins: m.wins || "",
      problems: m.problems || "",
      pipelineCleanup: m.pipeline_cleanup || "",
      actions,
      nextMeetingDate: m.next_meeting_date || "",
      nextMeetingTime: m.next_meeting_time || "",
      notes: m.notes || "",
    });
  };

  const updateField = <K extends keyof MeetingForm>(k: K, v: MeetingForm[K]) =>
    setEditing((p) => (p ? { ...p, [k]: v } : p));

  const addAction = () =>
    setEditing((p) => p ? { ...p, actions: [...p.actions, { description: "", responsible: "", deadline: "", done: false }] } : p);

  const updateAction = (i: number, patch: Partial<Action>) =>
    setEditing((p) => {
      if (!p) return p;
      const a = [...p.actions];
      a[i] = { ...a[i], ...patch };
      return { ...p, actions: a };
    });

  const removeAction = (i: number) =>
    setEditing((p) => p ? { ...p, actions: p.actions.filter((_, idx) => idx !== i) } : p);

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  // FORM VIEW
  if (editing) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>

          <h1 className="text-2xl font-bold">{editing.id ? "Editar Reunião" : "Nova Reunião de Pipeline"}</h1>

          {/* Header */}
          <Card>
            <CardContent className="p-5 grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Data da Reunião</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(editing.meetingDate, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar mode="single" selected={editing.meetingDate} onSelect={(d) => {
                      if (d) { updateField("meetingDate", d); updateField("weekLabel", getWeekLabel(d)); }
                    }} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Semana de</Label>
                <Input value={editing.weekLabel} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>Facilitador</Label>
                <Input value={editing.facilitator} onChange={(e) => updateField("facilitator", e.target.value)} placeholder="Nome" />
              </div>
            </CardContent>
          </Card>

          {/* Section 1 — Funnel Status */}
          <Card className="bg-muted/40">
            <CardHeader className="pb-2"><CardTitle className="text-base">📊 Status do Funil (automático)</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>Total em Pipeline:</strong> {funnelSummary.total} leads</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(funnelSummary.stages).map(([k, v]) => (
                  <Badge key={k} variant="outline">{k}: {v}</Badge>
                ))}
              </div>
              <p><strong>Revenue Esperado (propostas):</strong> {formatBRL(funnelSummary.expectedRevenue)}</p>
              {funnelSummary.atRisk.length > 0 && (
                <div>
                  <p className="text-destructive font-medium">⚠ Deals em Risco ({funnelSummary.atRisk.length}):</p>
                  <ul className="ml-4 list-disc text-muted-foreground">
                    {funnelSummary.atRisk.slice(0, 10).map((l) => <li key={l.id}>{l.name}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2 — Discussion */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">💬 Pontos de Discussão</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Vitórias — O que deu certo esta semana?</Label>
                <Textarea value={editing.wins} onChange={(e) => updateField("wins", e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Problemas — O que precisa de atenção?</Label>
                <Textarea value={editing.problems} onChange={(e) => updateField("problems", e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Limpeza de Pipeline — Leads para remover ou re-engajar?</Label>
                <Textarea value={editing.pipelineCleanup} onChange={(e) => updateField("pipelineCleanup", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Section 3 — Actions */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">✅ Ações</CardTitle>
              <Button size="sm" variant="outline" onClick={addAction}><Plus className="mr-1 h-4 w-4" /> Adicionar Ação</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing.actions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ação adicionada</p>}
              {editing.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <Checkbox checked={a.done} onCheckedChange={(v) => updateAction(i, { done: !!v })} className="mt-1" />
                  <div className="flex-1 grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Descrição" value={a.description} onChange={(e) => updateAction(i, { description: e.target.value })} />
                    <Input placeholder="Responsável" value={a.responsible} onChange={(e) => updateAction(i, { responsible: e.target.value })} />
                    <Input type="date" value={a.deadline} onChange={(e) => updateAction(i, { deadline: e.target.value })} />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeAction(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 4 — Next Meeting */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">📅 Próxima Reunião</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={editing.nextMeetingDate} onChange={(e) => updateField("nextMeetingDate", e.target.value)} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={editing.nextMeetingTime} onChange={(e) => updateField("nextMeetingTime", e.target.value)} />
              </div>
              <div>
                <Label>Local / Link</Label>
                <Input value={editing.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Zoom, Google Meet..." />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Reunião
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // LIST VIEW
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reunião de Pipeline</h1>
            <p className="text-muted-foreground">Revisão semanal do funil de vendas</p>
          </div>
          <Button onClick={() => setEditing(emptyForm())}><Plus className="mr-1 h-4 w-4" /> Nova Reunião</Button>
        </div>

        {meetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-semibold">Nenhuma reunião registrada</p>
              <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira reunião de pipeline</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {meetings.map((m) => {
              let actionCount = 0;
              try { actionCount = JSON.parse(m.actions || "[]").length; } catch { /* ignore */ }
              return (
                <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openExisting(m)}>
                  <CardContent className="p-4">
                    <p className="font-semibold">{format(new Date(m.meeting_date), "dd/MM/yyyy")}</p>
                    {m.week_label && <p className="text-sm text-muted-foreground">Semana {m.week_label}</p>}
                    <div className="mt-2 flex gap-2">
                      {m.facilitator && <Badge variant="outline">{m.facilitator}</Badge>}
                      <Badge variant="secondary">{actionCount} ações</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
