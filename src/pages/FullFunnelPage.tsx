import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimePeriod, toLocalDateString } from "@/contexts/TimePeriodContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TimePeriodSelector } from "@/components/TimePeriodSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowDownIcon } from "lucide-react";
import { FunnelTimingSection } from "@/components/funnel/FunnelTimingSection";

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
  prevVolume?: string | null;
  variationPct?: number | null;
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
  const timePeriod = useTimePeriod();
  const { startDate, endDate, compareEnabled, prevStartDate, prevEndDate } = timePeriod;
  const [sellerFilter, setSellerFilter] = useState<string>("all");

  const startDateStr = toLocalDateString(startDate);
  const endDateStr = toLocalDateString(endDate);

  // Team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["fullfunnel-team"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("id, name, role").eq("is_active", true);
      return data || [];
    },
    enabled: !!user,
  });

  // Daily seller KPIs (primary source)
  const { data: sellerKpis = [] } = useQuery({
    queryKey: ["fullfunnel-kpis", startDateStr, endDateStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_seller_kpis")
        .select("*")
        .gte("date", startDateStr)
        .lte("date", endDateStr);
      return data || [];
    },
    enabled: !!user,
  });

  // Previous period KPIs
  const prevStartStr = prevStartDate ? toLocalDateString(prevStartDate) : "";
  const prevEndStr = prevEndDate ? toLocalDateString(prevEndDate) : "";

  const { data: prevSellerKpis = [] } = useQuery({
    queryKey: ["fullfunnel-kpis-prev", prevStartStr, prevEndStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_seller_kpis")
        .select("*")
        .gte("date", prevStartStr)
        .lte("date", prevEndStr);
      return data || [];
    },
    enabled: !!user && compareEnabled && !!prevStartDate,
  });

  // Ad metrics
  const { data: adMetrics = [] } = useQuery({
    queryKey: ["fullfunnel-ad", startDateStr, endDateStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_metrics")
        .select("*")
        .gte("date", startDateStr)
        .lte("date", endDateStr);
      return data || [];
    },
    enabled: !!user,
  });

  // Filter KPIs by seller
  const filteredKpis = useMemo(() => {
    if (sellerFilter === "all") return sellerKpis;
    return sellerKpis.filter((k) => k.team_member_id === sellerFilter);
  }, [sellerKpis, sellerFilter]);

  const filteredPrevKpis = useMemo(() => {
    if (sellerFilter === "all") return prevSellerKpis;
    return prevSellerKpis.filter((k) => k.team_member_id === sellerFilter);
  }, [prevSellerKpis, sellerFilter]);

  // Aggregate KPIs
  const kpi = useMemo(() => {
    const a = { leads: 0, qualified: 0, scheduled: 0, completed: 0, sales: 0, revenue: 0 };
    filteredKpis.forEach((k) => {
      a.leads += k.leads_generated ?? 0;
      a.qualified += k.leads_qualified ?? 0;
      a.scheduled += k.meetings_scheduled ?? 0;
      a.completed += k.meetings_completed ?? 0;
      a.sales += k.sales ?? 0;
      a.revenue += Number(k.revenue) || 0;
    });
    return a;
  }, [filteredKpis]);

  const prevKpi = useMemo(() => {
    if (!compareEnabled) return null;
    const a = { leads: 0, qualified: 0, scheduled: 0, completed: 0, sales: 0, revenue: 0 };
    filteredPrevKpis.forEach((k) => {
      a.leads += k.leads_generated ?? 0;
      a.qualified += k.leads_qualified ?? 0;
      a.scheduled += k.meetings_scheduled ?? 0;
      a.completed += k.meetings_completed ?? 0;
      a.sales += k.sales ?? 0;
      a.revenue += Number(k.revenue) || 0;
    });
    return a;
  }, [filteredPrevKpis, compareEnabled]);

  const hasKpi = kpi.leads > 0 || kpi.sales > 0 || kpi.scheduled > 0;

  // Ad totals
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

  // Use KPI data for funnel stages; ad metrics for traffic stages
  const leadsGen = hasKpi ? kpi.leads : (hasAds ? adTotals.leads : 0);
  const qualified = hasKpi ? kpi.qualified : 0;
  const meetingsScheduled = hasKpi ? kpi.scheduled : 0;
  const meetingsCompleted = hasKpi ? kpi.completed : 0;
  const dealsClosed = hasKpi ? kpi.sales : 0;
  const totalRevenue = hasKpi ? kpi.revenue : 0;

  const qualRate = leadsGen > 0 ? (qualified / leadsGen) * 100 : 0;
  const schedulingRate = qualified > 0 ? (meetingsScheduled / qualified) * 100 : 0;
  const showRate = meetingsScheduled > 0 ? (meetingsCompleted / meetingsScheduled) * 100 : 0;
  const closeRate = meetingsCompleted > 0 ? (dealsClosed / meetingsCompleted) * 100 : 0;

  // Previous period values for comparison
  const prevLeadsGen = prevKpi ? prevKpi.leads : 0;
  const prevQualified = prevKpi ? prevKpi.qualified : 0;
  const prevScheduled = prevKpi ? prevKpi.scheduled : 0;
  const prevCompleted = prevKpi ? prevKpi.completed : 0;
  const prevDealsClosed = prevKpi ? prevKpi.sales : 0;

  function calcVar(cur: number, prev: number | null): number | null {
    if (!compareEnabled || prev == null || prev === 0) return null;
    return ((cur - prev) / Math.abs(prev)) * 100;
  }

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
      costLabel: "CPL", costValue: hasAds && leadsGen > 0 ? fmtBrl(adTotals.investment / leadsGen) : "—",
      volume: fmtNum(leadsGen > 0 ? leadsGen : null),
      prevVolume: compareEnabled ? fmtNum(prevLeadsGen > 0 ? prevLeadsGen : null) : null,
      variationPct: calcVar(leadsGen, prevLeadsGen),
      rateLabel: "Tx. Conexão", rateValue: hasAds && adTotals.page_views > 0 && adTotals.leads > 0 ? fmtPct((adTotals.leads / adTotals.page_views) * 100) : "—",
      hasData: hasKpi || hasAds,
    },
    {
      label: "LEADS QUALIFICADOS",
      costLabel: "Custo/Qual.", costValue: hasAds && qualified > 0 ? fmtBrl(adTotals.investment / qualified) : "—",
      volume: fmtNum(qualified > 0 ? qualified : null),
      prevVolume: compareEnabled ? fmtNum(prevQualified > 0 ? prevQualified : null) : null,
      variationPct: calcVar(qualified, prevQualified),
      rateLabel: "Tx. Qualif.", rateValue: fmtPct(leadsGen > 0 ? qualRate : null),
      hasData: hasKpi,
    },
    {
      label: "REUNIÕES AGENDADAS",
      costLabel: "Custo/Reun.", costValue: hasAds && meetingsScheduled > 0 ? fmtBrl(adTotals.investment / meetingsScheduled) : "—",
      volume: fmtNum(meetingsScheduled > 0 ? meetingsScheduled : null),
      prevVolume: compareEnabled ? fmtNum(prevScheduled > 0 ? prevScheduled : null) : null,
      variationPct: calcVar(meetingsScheduled, prevScheduled),
      rateLabel: "Tx. Agend.", rateValue: fmtPct(qualified > 0 ? schedulingRate : null),
      hasData: hasKpi,
    },
    {
      label: "REUNIÕES REALIZADAS",
      costLabel: "Custo/Realiz.", costValue: hasAds && meetingsCompleted > 0 ? fmtBrl(adTotals.investment / meetingsCompleted) : "—",
      volume: fmtNum(meetingsCompleted > 0 ? meetingsCompleted : null),
      prevVolume: compareEnabled ? fmtNum(prevCompleted > 0 ? prevCompleted : null) : null,
      variationPct: calcVar(meetingsCompleted, prevCompleted),
      rateLabel: "Show Rate", rateValue: fmtPct(meetingsScheduled > 0 ? showRate : null),
      hasData: hasKpi,
    },
    {
      label: "VENDAS",
      costLabel: "CAC", costValue: hasAds && dealsClosed > 0 ? fmtBrl(adTotals.investment / dealsClosed) : "—",
      volume: fmtNum(dealsClosed > 0 ? dealsClosed : null),
      prevVolume: compareEnabled ? fmtNum(prevDealsClosed > 0 ? prevDealsClosed : null) : null,
      variationPct: calcVar(dealsClosed, prevDealsClosed),
      rateLabel: "Close Rate", rateValue: fmtPct(meetingsCompleted > 0 ? closeRate : null),
      hasData: hasKpi,
    },
  ];

  const roas = hasAds && adTotals.investment > 0 ? totalRevenue / adTotals.investment : 0;
  const roi = hasAds && adTotals.investment > 0 ? ((totalRevenue - adTotals.investment) / adTotals.investment) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Funil Completo</h1>
          <p className="text-muted-foreground">Visualização end-to-end: do investimento à venda</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <TimePeriodSelector />
          {teamMembers.length > 0 && (
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filtrar vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {teamMembers.map((tm) => (
                  <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Funnel Stages */}
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
                      {compareEnabled && stage.prevVolume && (
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <p className="text-[10px] opacity-50">Ant: {stage.prevVolume}</p>
                          {stage.variationPct != null && (
                            <span className={`inline-flex items-center text-[10px] font-semibold ${stage.variationPct > 0 ? "text-green-600" : stage.variationPct < 0 ? "text-red-500" : "opacity-50"}`}>
                              {stage.variationPct > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : stage.variationPct < 0 ? <ArrowDown className="h-2.5 w-2.5" /> : null}
                              {stage.variationPct > 0 ? "+" : ""}{stage.variationPct.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}
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
        {(hasKpi || hasAds) && totalRevenue > 0 && (
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

        {/* Funnel Timing Analysis */}
        <FunnelTimingSection />
      </div>
    </DashboardLayout>
  );
}
