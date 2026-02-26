import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function fmt(n: number) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return Math.ceil(n).toLocaleString("pt-BR");
}

function fmtCurrency(n: number) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function GoalSimulatorPage() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  const [targetRevenue, setTargetRevenue] = useState("");
  const [avgTicket, setAvgTicket] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [showRate, setShowRate] = useState("");
  const [schedulingRate, setSchedulingRate] = useState("");
  const [qualificationRate, setQualificationRate] = useState("");
  const [workingDays, setWorkingDays] = useState("22");
  const [numSellers, setNumSellers] = useState("1");

  const toNum = (v: string) => parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;

  const tr = toNum(targetRevenue);
  const at = toNum(avgTicket);
  const cr = toNum(conversionRate);
  const sr = toNum(showRate);
  const scr = toNum(schedulingRate);
  const qr = toNum(qualificationRate);
  const wd = parseInt(workingDays) || 22;
  const ns = parseInt(numSellers) || 1;

  const requiredSales = at > 0 ? tr / at : 0;
  const completedMeetings = cr > 0 ? requiredSales / (cr / 100) : 0;
  const scheduledMeetings = sr > 0 ? completedMeetings / (sr / 100) : 0;
  const qualifiedLeads = scr > 0 ? scheduledMeetings / (scr / 100) : 0;
  const totalLeads = qr > 0 ? qualifiedLeads / (qr / 100) : 0;

  const salesPerDay = wd > 0 ? requiredSales / wd : 0;
  const meetingsPerDay = wd > 0 ? scheduledMeetings / wd : 0;
  const leadsPerDay = wd > 0 ? totalLeads / wd : 0;
  const salesPerSeller = ns > 0 ? requiredSales / ns : 0;
  const meetingsPerSellerPerDay = ns > 0 ? meetingsPerDay / ns : 0;

  const canCalculate = tr > 0 && at > 0 && cr > 0 && sr > 0 && scr > 0 && qr > 0;

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase.from("goal_simulations" as any).insert({
      user_id: profile.id,
      target_revenue: tr,
      avg_ticket: at,
      conversion_rate: cr,
      show_rate: sr,
      scheduling_rate: scr,
      qualification_rate: qr,
      working_days: wd,
      num_sellers: ns,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar simulação");
      console.error(error);
    } else {
      toast.success("Simulação salva com sucesso!");
    }
  };

  const funnelSteps = [
    { emoji: "🎯", label: "Meta", value: fmtCurrency(tr), sub: null, highlight: true, width: "100%" },
    { emoji: "💰", label: "Vendas Necessárias", value: `${fmt(requiredSales)} vendas`, sub: `${fmt(salesPerDay)}/dia · ${fmt(salesPerSeller)}/vendedor`, width: "88%" },
    { emoji: "📞", label: "Reuniões Realizadas", value: fmt(completedMeetings), sub: `${fmt(completedMeetings / (wd || 1))}/dia`, width: "76%" },
    { emoji: "📅", label: "Reuniões Agendadas", value: fmt(scheduledMeetings), sub: `${fmt(meetingsPerDay)}/dia · ${fmt(meetingsPerSellerPerDay)}/vendedor/dia`, width: "64%" },
    { emoji: "✅", label: "Leads Qualificados", value: fmt(qualifiedLeads), sub: `${fmt(qualifiedLeads / (wd || 1))}/dia`, width: "52%" },
    { emoji: "👥", label: "Total de Leads", value: fmt(totalLeads), sub: `${fmt(leadsPerDay)}/dia`, width: "40%" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulador de Metas Reverso</h1>
          <p className="text-muted-foreground mt-1">
            Comece pela meta e descubra exatamente o que precisa fazer para alcançar
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parâmetros</CardTitle>
            <CardDescription>Preencha os campos e veja os resultados em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <Label>Meta de Faturamento (R$)</Label>
                <Input placeholder="ex: 100.000" value={targetRevenue} onChange={(e) => setTargetRevenue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ticket Médio (R$)</Label>
                <Input placeholder="ex: 5.000" value={avgTicket} onChange={(e) => setAvgTicket(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de Conversão (%)</Label>
                <Input type="number" min={0} max={100} placeholder="ex: 25" value={conversionRate} onChange={(e) => setConversionRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de Comparecimento (%)</Label>
                <Input type="number" min={0} max={100} placeholder="ex: 70" value={showRate} onChange={(e) => setShowRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de Agendamento (%)</Label>
                <Input type="number" min={0} max={100} placeholder="ex: 30" value={schedulingRate} onChange={(e) => setSchedulingRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de Qualificação (%)</Label>
                <Input type="number" min={0} max={100} placeholder="ex: 50" value={qualificationRate} onChange={(e) => setQualificationRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dias Úteis no Mês</Label>
                <Input type="number" min={1} value={workingDays} onChange={(e) => setWorkingDays(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Número de Vendedores</Label>
                <Input type="number" min={1} value={numSellers} onChange={(e) => setNumSellers(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funnel Results */}
        {canCalculate && (
          <div className="space-y-0 flex flex-col items-center">
            {funnelSteps.map((step, i) => (
              <div key={i} className="flex flex-col items-center" style={{ width: step.width, minWidth: 260 }}>
                {i > 0 && (
                  <div className="w-0.5 h-6 bg-primary/30" />
                )}
                <Card className={`w-full ${step.highlight ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                  <CardContent className="py-4 px-5 text-center">
                    <p className={`text-xs font-medium uppercase tracking-wider ${step.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {step.emoji} {step.label}
                    </p>
                    <p className={`text-3xl font-bold mt-1 ${step.highlight ? "" : "text-foreground"}`}>
                      {step.value}
                    </p>
                    {step.sub && (
                      <p className={`text-sm mt-1 ${step.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {step.sub}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Save Button */}
        {canCalculate && (
          <div className="flex justify-center">
            <Button onClick={handleSave} disabled={saving} size="lg" className="px-8">
              {saving ? "Salvando…" : "Salvar Simulação"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}