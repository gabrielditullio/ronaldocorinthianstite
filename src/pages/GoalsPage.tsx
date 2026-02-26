import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Target, AlertTriangle, TrendingDown } from "lucide-react";

function parseCurrency(v: string): number {
  return Number(v.replace(/[^\d]/g, "")) || 0;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
}

export default function GoalsPage() {
  const [revenueGoal, setRevenueGoal] = useState(180000);
  const [avgTicket, setAvgTicket] = useState(10000);
  const [margin, setMargin] = useState(60);

  const [closeRate, setCloseRate] = useState(67);
  const [proposalRate, setProposalRate] = useState(60);
  const [meetingRate, setMeetingRate] = useState(60);
  const [qualRate, setQualRate] = useState(67);

  const funnel = useMemo(() => {
    const deals = avgTicket > 0 ? Math.ceil(revenueGoal / avgTicket) : 0;
    const proposals = closeRate > 0 ? Math.ceil(deals / (closeRate / 100)) : 0;
    const meetings = proposalRate > 0 ? Math.ceil(proposals / (proposalRate / 100)) : 0;
    const qualifications = meetingRate > 0 ? Math.ceil(meetings / (meetingRate / 100)) : 0;
    const leads = qualRate > 0 ? Math.ceil(qualifications / (qualRate / 100)) : 0;
    const perWeek = Math.ceil(leads / 4);
    const perDay = Math.ceil(leads / 20);
    return { deals, proposals, meetings, qualifications, leads, perWeek, perDay };
  }, [revenueGoal, avgTicket, closeRate, proposalRate, meetingRate, qualRate]);

  const steps = [
    { label: "Deals Necessários", value: funnel.deals, math: `${formatBRL(revenueGoal)} ÷ ${formatBRL(avgTicket)}`, color: "bg-primary", width: "w-[45%]" },
    { label: "Propostas", value: funnel.proposals, math: `${funnel.deals} ÷ ${closeRate}%`, color: "bg-primary/85", width: "w-[55%]" },
    { label: "Meetings", value: funnel.meetings, math: `${funnel.proposals} ÷ ${proposalRate}%`, color: "bg-primary/70", width: "w-[65%]" },
    { label: "Qualificações", value: funnel.qualifications, math: `${funnel.meetings} ÷ ${meetingRate}%`, color: "bg-primary/55", width: "w-[78%]" },
    { label: "Leads Totais", value: funnel.leads, math: `${funnel.qualifications} ÷ ${qualRate}%`, color: "bg-accent", width: "w-[90%]" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Metas Reversas</h1>
          <p className="text-muted-foreground">Calcule quantos leads você precisa para bater sua meta</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* INPUTS */}
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Meta e Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Meta de Faturamento (mês)</Label>
                  <Input value={formatBRL(revenueGoal)} onChange={(e) => setRevenueGoal(parseCurrency(e.target.value))} />
                </div>
                <div>
                  <Label>Ticket Médio</Label>
                  <Input value={formatBRL(avgTicket)} onChange={(e) => setAvgTicket(parseCurrency(e.target.value))} />
                </div>
                <div>
                  <Label>Margem Desejada (%)</Label>
                  <Input type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value))} min={0} max={100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Taxas de Conversão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Taxa de Fechamento (%)", value: closeRate, set: setCloseRate },
                  { label: "Taxa Proposta/Meeting (%)", value: proposalRate, set: setProposalRate },
                  { label: "Taxa Meeting/Qualificação (%)", value: meetingRate, set: setMeetingRate },
                  { label: "Taxa Qualificação/Lead (%)", value: qualRate, set: setQualRate },
                ].map((f) => (
                  <div key={f.label}>
                    <Label>{f.label}</Label>
                    <Input type="number" value={f.value} onChange={(e) => f.set(Number(e.target.value))} min={1} max={100} />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Ajuste as taxas conforme seu histórico real. Se não sabe, use os padrões.</p>
              </CardContent>
            </Card>
          </div>

          {/* RESULTS */}
          <div className="space-y-5">
            {/* Visual Funnel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Funil Reverso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {steps.map((s, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`${s.width} ${s.color} rounded-lg px-4 py-3 text-center text-primary-foreground transition-all`}>
                      <p className="text-lg font-bold">{s.value} {s.label}</p>
                      <p className="text-xs opacity-80">{s.math}</p>
                    </div>
                    {i < steps.length - 1 && <TrendingDown className="my-1 h-4 w-4 text-muted-foreground" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-accent">
              <CardContent className="p-6 text-center space-y-2">
                <Target className="mx-auto h-8 w-8 text-accent" />
                <p className="text-3xl font-bold text-accent">{funnel.leads} Leads</p>
                <p className="text-lg font-semibold">🎯 PRECISA GERAR ESTE MÊS</p>
                <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                  <span>= <strong>{funnel.perWeek}</strong> por semana</span>
                  <span>= <strong>{funnel.perDay}</strong> por dia útil</span>
                </div>
              </CardContent>
            </Card>

            {/* Feasibility */}
            {funnel.perDay > 15 && (
              <Alert className="border-destructive bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive font-medium">
                  Meta provavelmente inviável — considere aumentar ticket ou melhorar conversão
                </AlertDescription>
              </Alert>
            )}
            {funnel.perDay > 10 && funnel.perDay <= 15 && (
              <Alert className="border-warning bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="font-medium">
                  Meta ambiciosa — revise se é realista com seu time atual
                </AlertDescription>
              </Alert>
            )}

            {/* Rule */}
            <Card>
              <CardContent className="p-4">
                <Badge variant="outline" className="mb-2">Regra de Ouro</Badge>
                <p className="text-sm text-muted-foreground">
                  CAC &lt; 30% do ticket médio. Payback &lt; 3 meses. Use a <span className="font-semibold text-foreground">Calculadora de CAC</span> para validar.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
