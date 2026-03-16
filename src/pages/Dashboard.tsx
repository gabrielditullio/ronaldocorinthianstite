import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimePeriod, toLocalDateString } from "@/contexts/TimePeriodContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TimePeriodSelector } from "@/components/TimePeriodSelector";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { SellerSummaryTable } from "@/components/dashboard/SellerSummaryTable";
import { DailyEvolutionChart } from "@/components/dashboard/DailyEvolutionChart";
import { DailyEvolutionChart } from "@/components/dashboard/DailyEvolutionChart";
import OnboardingWizard from "@/components/OnboardingWizard";
import { PageSkeleton, EmptyState } from "@/components/ui/page-states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const timePeriod = useTimePeriod();
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem("onboarding_complete") === "true"
  );
  const [sellerFilter, setSellerFilter] = useState<string>("all");

  const startDateStr = toLocalDateString(timePeriod.startDate);
  const endDateStr = toLocalDateString(timePeriod.endDate);

  // Previous period for MoM comparison
  const diffMs = timePeriod.endDate.getTime() - timePeriod.startDate.getTime();
  const prevEnd = new Date(timePeriod.startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diffMs);
  const prevStartStr = toLocalDateString(prevStart);
  const prevEndStr = toLocalDateString(prevEnd);

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: teamMembers = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["dashboard-team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["dashboard-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .order("month_year", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Fetch daily_seller_kpis for current period ──
  const { data: sellerKpis = [], isLoading: loadingKpis } = useQuery({
    queryKey: ["dashboard-seller-kpis", startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_seller_kpis")
        .select("*")
        .gte("date", startDateStr)
        .lte("date", endDateStr);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Fetch daily_seller_kpis for previous period (MoM) ──
  const { data: prevSellerKpis = [] } = useQuery({
    queryKey: ["dashboard-seller-kpis-prev", prevStartStr, prevEndStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_seller_kpis")
        .select("*")
        .gte("date", prevStartStr)
        .lte("date", prevEndStr);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Filter KPIs by selected seller ──
  const filteredKpis = useMemo(() => {
    if (sellerFilter === "all") return sellerKpis;
    return sellerKpis.filter((k) => k.team_member_id === sellerFilter);
  }, [sellerKpis, sellerFilter]);

  const filteredPrevKpis = useMemo(() => {
    if (sellerFilter === "all") return prevSellerKpis;
    return prevSellerKpis.filter((k) => k.team_member_id === sellerFilter);
  }, [prevSellerKpis, sellerFilter]);

  // ── Aggregate KPIs ──
  const kpiAgg = useMemo(() => {
    const agg = { leads: 0, qualified: 0, scheduled: 0, completed: 0, sales: 0, revenue: 0 };
    filteredKpis.forEach((k) => {
      agg.leads += k.leads_generated ?? 0;
      agg.qualified += k.leads_qualified ?? 0;
      agg.scheduled += k.meetings_scheduled ?? 0;
      agg.completed += k.meetings_completed ?? 0;
      agg.sales += k.sales ?? 0;
      agg.revenue += Number(k.revenue) || 0;
    });
    return agg;
  }, [filteredKpis]);

  const prevKpiAgg = useMemo(() => {
    const agg = { leads: 0, qualified: 0, scheduled: 0, completed: 0, sales: 0, revenue: 0 };
    filteredPrevKpis.forEach((k) => {
      agg.leads += k.leads_generated ?? 0;
      agg.qualified += k.leads_qualified ?? 0;
      agg.scheduled += k.meetings_scheduled ?? 0;
      agg.completed += k.meetings_completed ?? 0;
      agg.sales += k.sales ?? 0;
      agg.revenue += Number(k.revenue) || 0;
    });
    return agg;
  }, [filteredPrevKpis]);

  const loading = loadingLeads || loadingTeam || loadingKpis;
  const hasData = leads.length > 0 || sellerKpis.length > 0;

  const showOnboarding =
    !loading &&
    !onboardingDismissed &&
    profile?.subscription_status === "active" &&
    !hasData &&
    teamMembers.length === 0;

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setOnboardingDismissed(true)} />;
  }

  // Determine subtitle based on KPI data
  const getSubtitle = () => {
    if (!hasData) return "Comece o dia analisando seus números. Dados são o melhor café da manhã. ☕";
    if (kpiAgg.revenue >= 100000) return "Sua equipe está acima da meta este mês. Continue assim! 🚀";
    if (kpiAgg.revenue >= 60000) return "Você está no caminho certo para bater a meta. Foco! 💪";
    return "Ainda dá tempo de virar o mês. Vamos analisar os gargalos. 🔍";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {profile?.full_name?.split(" ")[0] || "Gestor"}! 👋
          </h1>
          <p className="text-base text-muted-foreground">{getSubtitle()}</p>
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
                  <SelectItem key={tm.id} value={tm.id}>
                    {tm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <PageSkeleton />
        ) : !hasData ? (
          <EmptyState
            icon={Filter}
            title="Seu painel está esperando por dados"
            description="Adicione leads no Funil ou preencha KPIs de vendedores para ver suas métricas."
            actionLabel="Ir para KPIs"
            actionTo="/kpis-vendedores"
          />
        ) : (
          <>
            <DashboardKPIs
              leads={leads}
              snapshots={snapshots}
              timePeriod={timePeriod}
              kpiAgg={kpiAgg}
              prevKpiAgg={prevKpiAgg}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <FunnelChart leads={leads} />
              <RevenueChart
                snapshots={snapshots}
                leads={leads}
                timePeriod={timePeriod}
                sellerKpis={filteredKpis}
              />
            </div>
            <DashboardAlerts leads={leads} teamMembers={teamMembers} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
