import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown } from "lucide-react";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmtBrl(v: number | null) {
  if (v == null || isNaN(v)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtNum(v: number | null) {
  if (v == null || isNaN(v)) return "—";
  return v.toLocaleString("pt-BR");
}

function fmtPct(v: number | null) {
  if (v == null || isNaN(v) || !isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

interface FunnelStage {
  label: string;
  costLabel: string;
  costValue: string;
  volume: string;
  rateLabel: string;
  rateValue: string;
  hasData: boolean;
}

const STAGE_COLORS = [
  { bg: "bg-[#F3E8E0]", border: "border-[#D4B8A8]", text: "text-[#6B5C54]" },
  { bg: "bg-[#EEE0D5]", border: "border-[#CBA98F]", text: "text-[#6B5C54]" },
  { bg: "bg-[#E8D5C8]", border: "border-[#C09A80]", text: "text-[#5A4A3F]" },
  { bg: "bg-[#E0C8B8]", border: "border-[#B58B70]", text: "text-[#5A4A3F]" },
  { bg: "bg-[#D5B5A0]", border: "border-[#A07A60]", text: "text-[#4A3D34]" },
  { bg: "bg-[#C8A08A]", border: "border-[#8B6650]", text: "text-[#3D3229]" },
  { bg: "bg-[#B08068]", border: "border-[#7C5040]", text: "text-white" },
  { bg: "bg-[#8E5A48]", border: "border-[#6B4035]", text: "text-white" },
  { bg: "bg-[#6B3A30]", border: "border-[#4A2520]", text: "text-white" },
];

export default function FullFunnelPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const monthYear = `${year}-${String(month + 1).padStart(2, "0")}`;
  const numDays = new Date(year, month + 1, 0).getDate();
  const startDate = `${monthYear}-01`;
  const endDate = `${monthYear}-${String(numDays).padStart(2, "0")}`;

  // Ad metrics
  const { data: adMetrics = [] } = useQuery({
    queryKey: ["funil-ad", user?.id, monthYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_metrics")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", startDate)
        .lte("date", endDate);
      return data || [];
    },
    enabled: !!user,
  });

  // Monthly snapshot
  const { data: snapshot } = useQuery({
    queryKey: ["funil-snap", user?.id, monthYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .eq("user_id", user!.id)
        .eq("month_year", monthYear)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const adTotals = useMemo(() => {
    const t = { investment: 0, impressions: 0, clicks: 0, page_views: 0, leads: 0 };
    adMetrics.forEach((r: any) => {
      t.investment += Number(r.investment) || 0;
      t.impressions += Number(r.impressions) || 0;
      t.clicks += Number(r.clicks) || 0;
      t.page_views += Number(r.page_views) || 0;
      t.leads += Number(r.leads_from_ads) || 0;
    });
    return t;
  }, [adMetrics]);

  const hasAds = adTotals.investment > 0;
  const hasSnap = !!snapshot;

  const leadsGen = snapshot?.leads_generated ?? 0;
  const qualRate = snapshot?.qualification_rate ?? 0;
  const qualified = leadsGen > 0 ? Math.round(leadsGen * qualRate / 100) : 0;
  const meetingsBooked = snapshot?.meetings_booked ?? 0;
  const proposalsSent = snapshot?.proposals_sent ?? 0;
  const dealsClosed = snapshot?.deals_closed ?? 0;
  const totalRevenue = snapshot?.total_revenue ?? 0;
  const closeRate = snapshot?.close_rate ?? 0;

  const schedulingRate = qualified > 0 ? (meetingsBooked / qualified) * 100 : 0;
  const showRate = meetingsBooked > 0 ? (proposalsSent / meetingsBooked) * 100 : 0;

  // Build funnel stages
  const stages: FunnelStage[] = [
    {
      label: "INVESTIMENTO",
      costLabel: "", costValue: "",
      volume: fmtBrl(hasAds ? adTotals.investment : null),
      rateLabel: "", rateValue: "",
      hasData: hasAds,
    },
    {
      label: "IMPRESSÕES",
      costLabel: "CPM", costValue: hasAds && adTotals.impressions > 0 ? fmtBrl((adTotals.investment / adTotals.impressions) * 1000) : "—",
      volume: fmtNum(hasAds ? adTotals.impressions : null),
      rateLabel: "", rateValue: "",
      hasData: hasAds,
    },
    {
      label: "CLIQUES",
      costLabel: "CPC", costValue: hasAds && adTotals.clicks > 0 ? fmtBrl(adTotals.investment / adTotals.clicks) : "—",
      volume: fmtNum(hasAds ? adTotals.clicks : null),
      rateLabel: "CTR", rateValue: hasAds && adTotals.impressions > 0 ? fmtPct((adTotals.clicks / adTotals.impressions) * 100) : "—",
      hasData: hasAds,
    },
    {
      label: "VISUALIZAÇÕES DE PÁGINA",
      costLabel: "Custo/PV", costValue: hasAds && adTotals.page_views > 0 ? fmtBrl(adTotals.investment / adTotals.page_views) : "—",
      volume: fmtNum(hasAds ? adTotals.page_views : null),
      rateLabel: "Clique→PV", rateValue: hasAds && adTotals.clicks > 0 ? fmtPct((adTotals.page_views / adTotals.clicks) * 100) : "—",
      hasData: hasAds,
    },
    {
      label: "LEADS",
      costLabel: "CPL", costValue: hasAds && adTotals.leads > 0 ? fmtBrl(adTotals.investment / adTotals.leads) : (hasSnap && leadsGen > 0 && hasAds ? fmtBrl(adTotals.investment / leadsGen) : "—"),
      volume: fmtNum(hasSnap ? leadsGen : (hasAds ? adTotals.leads : null)),
      rateLabel: "Tx. Conexão", rateValue: hasAds && adTotals.page_views > 0 && adTotals.leads > 0 ? fmtPct((adTotals.leads / adTotals.page_views) * 100) : "—",
      hasData: hasSnap || hasAds,
    },
    {
      label: "LEADS QUALIFICADOS",
      costLabel: "Custo/Qual.", costValue: hasAds && qualified > 0 ? fmtBrl(adTotals.investment / qualified) : "—",
      volume: fmtNum(hasSnap ? qualified : null),
      rateLabel: "Tx. Qualif.", rateValue: fmtPct(hasSnap ? qualRate : null),
      hasData: hasSnap,
    },
    {
      label: "REUNIÕES AGENDADAS",
      costLabel: "Custo/Reun.", costValue: hasAds && meetingsBooked > 0 ? fmtBrl(adTotals.investment / meetingsBooked) : "—",
      volume: fmtNum(hasSnap ? meetingsBooked : null),
      rateLabel: "Tx. Agend.", rateValue: fmtPct(hasSnap && qualified > 0 ? schedulingRate : null),
      hasData: hasSnap,
    },
    {
      label: "REUNIÕES REALIZADAS",
      costLabel: "Custo/Realiz.", costValue: hasAds && proposalsSent > 0 ? fmtBrl(adTotals.investment / proposalsSent) : "—",
      volume: fmtNum(hasSnap ? proposalsSent : null),
      rateLabel: "Show Rate", rateValue: fmtPct(hasSnap && meetingsBooked > 0 ? showRate : null),
      hasData: hasSnap,
    },
    {
      label: "VENDAS",
      costLabel: "CAC", costValue: hasAds && dealsClosed > 0 ? fmtBrl(adTotals.investment / dealsClosed) : "—",
      volume: fmtNum(hasSnap ? dealsClosed : null),
      rateLabel: "Close Rate", rateValue: fmtPct(hasSnap ? closeRate : null),
      hasData: hasSnap,
    },
  ];

  const roas = hasAds && adTotals.investment > 0 ? totalRevenue / adTotals.investment : 0;
  const roi = hasAds && adTotals.investment > 0 ? ((totalRevenue - adTotals.investment) / adTotals.investment) * 100 : 0;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Funil Completo</h1>
            <p className="text-muted-foreground">Visualização end-to-end: do investimento à venda</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Funnel Stages */}
        {/* Mobile: vertical card stack; Desktop: trapezoid funnel */}
        <div className="flex flex-col items-center gap-0">
          {stages.map((stage, idx) => {
            const color = STAGE_COLORS[idx];
            const widthPct = 100 - (idx * 5.5);
            const isGray = !stage.hasData;

            return (
              <div key={idx} className="flex flex-col items-center w-full">
                {idx > 0 && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div
                  className={`rounded-lg border-2 px-3 sm:px-4 py-3 transition-all w-full ${
                    isGray ? "bg-muted/50 border-muted text-muted-foreground" : `${color.bg} ${color.border} ${color.text}`
                  }`}
                  style={{ maxWidth: `${widthPct}%` }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 text-center mb-1.5">
                    {stage.label}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center text-center gap-1">
                    <div className="hidden sm:block">
                      {stage.costLabel ? (
                        <>
                          <p className="text-[10px] uppercase opacity-60">{stage.costLabel}</p>
                          <p className="text-xs font-semibold">{stage.costValue}</p>
                        </>
                      ) : <div />}
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-tight">{stage.volume}</p>
                    </div>
                    <div className="hidden sm:block">
                      {stage.rateLabel ? (
                        <>
                          <p className="text-[10px] uppercase opacity-60">{stage.rateLabel}</p>
                          <p className="text-xs font-semibold">{stage.rateValue}</p>
                        </>
                      ) : <div />}
                    </div>
                    {/* Mobile: show cost and rate inline */}
                    <div className="sm:hidden flex justify-center gap-4 text-[10px]">
                      {stage.costLabel && (
                        <span><span className="opacity-60">{stage.costLabel}:</span> <span className="font-semibold">{stage.costValue}</span></span>
                      )}
                      {stage.rateLabel && (
                        <span><span className="opacity-60">{stage.rateLabel}:</span> <span className="font-semibold">{stage.rateValue}</span></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue highlight */}
        {hasSnap && (
          <Card className="bg-[#5B2333] text-white border-none">
            <CardContent className="py-6 text-center space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider opacity-70">Faturamento</p>
              <p className="text-3xl font-bold">{fmtBrl(totalRevenue)}</p>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div>
                  <p className="text-xs opacity-70">ROAS</p>
                  <p className="text-lg font-bold">{roas > 0 ? `${roas.toFixed(1)}x` : "—"}</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <p className="text-xs opacity-70">ROI</p>
                  <p className="text-lg font-bold">{roi !== 0 ? `${roi.toFixed(0)}%` : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
