import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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

function fmtPct(n: number) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toFixed(1).replace(".", ",") + "%";
}

function calcRevenue(at: number, cr: number, sr: number, scr: number, qr: number, totalLeads: number) {
  if (at <= 0 || cr <= 0 || sr <= 0 || scr <= 0 || qr <= 0) return 0;
  const qualified = totalLeads * (qr / 100);
  const scheduled = qualified * (scr / 100);
  const completed = scheduled * (sr / 100);
  const sales = completed * (cr / 100);
  return sales * at;
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

  // Improvement sliders
  const [impQualification, setImpQualification] = useState(0);
  const [impScheduling, setImpScheduling] = useState(0);
  const [impShow, setImpShow] = useState(0);
  const [impConversion, setImpConversion] = useState(0);

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

  // Improvement simulation
  const newQr = qr * (1 + impQualification / 100);
  const newScr = scr * (1 + impScheduling / 100);
  const newSr = sr * (1 + impShow / 100);
  const newCr = cr * (1 + impConversion / 100);

  const projectedRevenue = useMemo(() => {
    if (!canCalculate) return 0;
    return calcRevenue(at, newCr, newSr, newScr, newQr, totalLeads);
  }, [canCalculate, at, newCr, newSr, newScr, newQr, totalLeads]);

  const revenueDiff = projectedRevenue - tr;
  const revenueDiffPct = tr > 0 ? (revenueDiff / tr) * 100 : 0;
  const hasImprovement = impQualification > 0 || impScheduling > 0 || impShow > 0 || impConversion > 0;

  // Find highest impact improvement
  const impactInsight = useMemo(() => {
    if (!canCalculate || !hasImprovement) return null;
    const impacts = [
      { name: "Taxa de Qualificação", imp: impQualification, from: qr, to: newQr, rev: calcRevenue(at, cr, sr, scr, qr * (1 + impQualification / 100), totalLeads) },
      { name: "Taxa de Agendamento", imp: impScheduling, from: scr, to: newScr, rev: calcRevenue(at, cr, sr, scr * (1 + impScheduling / 100), qr, totalLeads) },
      { name: "Taxa de Comparecimento", imp: impShow, from: sr, to: newSr, rev: calcRevenue(at, cr, sr * (1 + impShow / 100), scr, qr, totalLeads) },
      { name: "Taxa de Conversão", imp: impConversion, from: cr, to: newCr, rev: calcRevenue(at, cr * (1 + impConversion / 100), sr, scr, qr, totalLeads) },
    ].filter(i => i.imp > 0);
    if (impacts.length === 0) return null;
    const best = impacts.reduce((a, b) => (b.rev - tr) > (a.rev - tr) ? b : a);
    const extraSales = at > 0 ? (best.rev - tr) / at : 0;
    return `Ao melhorar sua ${best.name} em ${best.imp}% (de ${fmtPct(best.from)} para ${fmtPct(best.to)}), você conseguiria ${fmt(extraSales)} vendas adicionais e mais ${fmtCurrency(best.rev - tr)} em faturamento.`;
  }, [canCalculate, hasImprovement, impQualification, impScheduling, impShow, impConversion, qr, scr, sr, cr, at, tr, totalLeads, newQr, newScr, newSr, newCr]);

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

  const sliderRates = [
    { label: "Taxa de Qualificação", original: qr, improved: newQr, value: impQualification, set: setImpQualification },
    { label: "Taxa de Agendamento", original: scr, improved: newScr, value: impScheduling, set: setImpScheduling },
    { label: "Taxa de Comparecimento", original: sr, improved: newSr, value: impShow, set: setImpShow },
    { label: "Taxa de Conversão", original: cr, improved: newCr, value: impConversion, set: setImpConversion },
  ];

  const maxBar = Math.max(tr, projectedRevenue) || 1;

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
                {i > 0 && <div className="w-0.5 h-6 bg-primary/30" />}
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

        {/* ═══ Improvement Simulator ═══ */}
        {canCalculate && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">📊 Simulador de Melhoria</h2>
              <p className="text-muted-foreground mt-1">Veja o impacto de melhorar suas taxas no resultado final</p>
            </div>

            {/* Sliders */}
            <Card>
              <CardContent className="py-6 space-y-6">
                {sliderRates.map((r) => (
                  <div key={r.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{r.label}</span>
                      <span className="text-muted-foreground">
                        {fmtPct(r.original)} → <span className="font-semibold text-foreground">{fmtPct(r.improved)}</span>
                        {r.value > 0 && <span className="ml-1 text-emerald-600">(+{r.value}%)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        min={0}
                        max={50}
                        step={5}
                        value={[r.value]}
                        onValueChange={([v]) => r.set(v)}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-14 text-right text-foreground">+{r.value}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Result highlight */}
            {hasImprovement && (
              <>
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardContent className="py-6 text-center space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resultado Atual</p>
                        <p className="text-2xl font-bold text-foreground">{fmtCurrency(tr)}</p>
                      </div>
                      <div className="text-2xl text-muted-foreground">→</div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">Resultado Projetado</p>
                        <p className="text-4xl font-bold text-emerald-700">{fmtCurrency(projectedRevenue)}</p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-emerald-600">
                      Variação: +{fmtCurrency(revenueDiff)} (+{revenueDiffPct.toFixed(1).replace(".", ",")}%)
                    </p>
                  </CardContent>
                </Card>

                {/* Dual bar chart */}
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Resultado Atual</span>
                          <span className="font-medium text-foreground">{fmtCurrency(tr)}</span>
                        </div>
                        <div className="h-8 rounded-md bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-md bg-muted-foreground/30 transition-all"
                            style={{ width: `${(tr / maxBar) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-600 font-medium">Resultado Projetado</span>
                          <span className="font-bold text-emerald-700">{fmtCurrency(projectedRevenue)}</span>
                        </div>
                        <div className="h-8 rounded-md bg-emerald-50 overflow-hidden">
                          <div
                            className="h-full rounded-md bg-emerald-500 transition-all"
                            style={{ width: `${(projectedRevenue / maxBar) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Insight */}
                {impactInsight && (
                  <Card className="border-primary/20">
                    <CardContent className="py-5">
                      <p className="text-sm text-foreground leading-relaxed">💡 {impactInsight}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}