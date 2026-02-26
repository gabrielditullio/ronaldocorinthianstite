import { useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Clock, AlertTriangle, Users, Quote } from "lucide-react";

export default function AlignmentPage() {
  const { user } = useAuth();

  const { data: leads = [] } = useQuery({
    queryKey: ["leads_alignment", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const metrics = useMemo(() => {
    const rejected = leads.filter(
      (l) =>
        l.previous_stage &&
        ["meeting", "proposal"].includes(l.previous_stage) &&
        ["qualification", "lead"].includes(l.stage)
    ).length;
    const totalMeetingEver = leads.filter(
      (l) =>
        l.stage === "meeting" ||
        l.previous_stage === "meeting" ||
        ["proposal", "closed_won", "closed_lost"].includes(l.stage)
    ).length;
    const rejectionRate = totalMeetingEver > 0 ? rejected / totalMeetingEver : 0;

    const withChange = leads.filter((l) => l.created_at && l.stage_changed_at && l.stage !== "lead");
    const avgDays =
      withChange.length > 0
        ? withChange.reduce((s, l) => {
            const diff = new Date(l.stage_changed_at!).getTime() - new Date(l.created_at!).getTime();
            return s + diff / (1000 * 60 * 60 * 24);
          }, 0) / withChange.length
        : 0;

    const inHandoff = leads.filter((l) => l.stage === "meeting").length;

    return { rejectionRate, avgDays, inHandoff };
  }, [leads]);

  const CheckItem = ({ text }: { text: string }) => (
    <div className="flex items-start gap-3 py-1.5">
      <CheckSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <span className="text-foreground">{text}</span>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto print:max-w-none">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alinhamento SDR–Closer</h1>
          <p className="text-muted-foreground">SLA e critérios de handoff entre pré-vendas e vendas</p>
        </div>

        {/* Section 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Critério de Handoff — Quando um lead PODE ser passado para o Closer?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <CheckItem text="Lead respondeu às tentativas de contato" />
            <CheckItem text="Lead confirmou interesse" />
            <CheckItem text="Lead respondeu qualificação básica (orçamento, prazo, decisor)" />
            <CheckItem text="Lead tem fit de produto" />
            <CheckItem text="Lead está no perfil ICP" />
            <CheckItem text="Contato é decisor ou influenciador" />
            <p className="text-sm text-muted-foreground mt-4 italic border-l-2 border-primary pl-3">
              Se falta algum item → voltar para SDR
            </p>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Checklist de Entrega — O que o SDR deve preencher antes do handoff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Informações do Lead</h4>
                <CheckItem text="Nome completo" />
                <CheckItem text="E-mail" />
                <CheckItem text="Telefone" />
                <CheckItem text="Cargo" />
                <CheckItem text="Empresa" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Contexto</h4>
                <CheckItem text="Origem do lead" />
                <CheckItem text="Gatilho / interesse" />
                <CheckItem text="Pain point principal" />
                <CheckItem text="Orçamento estimado" />
                <CheckItem text="Timeline de decisão" />
                <CheckItem text="Decisor identificado" />
                <CheckItem text="Próximo passo combinado" />
                <CheckItem text="Nível de interesse (1-5)" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3 — SLA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              SLA do Closer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Primeiro Contato", value: "até 48h", sub: "após handoff" },
                { label: "Discovery", value: "até 5 dias", sub: "após contato" },
                { label: "Proposta", value: "até 10 dias", sub: "após discovery" },
                { label: "Follow-up", value: "mín. 3×", sub: "até 15 dias" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border bg-card p-4 text-center"
                >
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold text-primary mt-1">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 4 — Dynamic Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Métricas de Alinhamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-5 text-center">
                <p className="text-sm text-muted-foreground">Taxa de Rejeição</p>
                <p className="text-3xl font-bold text-destructive mt-1">
                  {(metrics.rejectionRate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">leads devolvidos ao SDR</p>
              </div>
              <div className="rounded-lg border bg-card p-5 text-center">
                <p className="text-sm text-muted-foreground">Tempo Médio Lead→Contato</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {metrics.avgDays.toFixed(1)} dias
                </p>
                <p className="text-xs text-muted-foreground">da criação ao primeiro avanço</p>
              </div>
              <div className="rounded-lg border bg-card p-5 text-center">
                <p className="text-sm text-muted-foreground">Leads em Handoff Ativo</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {metrics.inHandoff}
                </p>
                <p className="text-xs text-muted-foreground">no estágio "Meeting"</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5 — Regra de Ouro */}
        <Card className="border-primary/30 bg-primary/5 print:bg-transparent">
          <CardContent className="py-6">
            <div className="flex gap-4 items-start">
              <Quote className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-foreground font-medium leading-relaxed">
                  Sem alinhamento claro: SDR fica frustrado <span className="italic">("levo leads bons e closer não fecha")</span>,
                  Closer fica frustrado <span className="italic">("recebo lixo do SDR")</span>.
                </p>
                <p className="text-primary font-semibold mt-2">
                  Com alinhamento: transparência + expectativa clara = operação limpa.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
