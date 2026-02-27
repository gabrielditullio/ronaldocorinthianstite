import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimePeriod } from "@/contexts/TimePeriodContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TimePeriodSelector } from "@/components/TimePeriodSelector";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import OnboardingWizard from "@/components/OnboardingWizard";
import { PageSkeleton, EmptyState } from "@/components/ui/page-states";
import { Filter } from "lucide-react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function getSubtitle(leads: any[], snapshots: any[]): string {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const closedWon = leads.filter(
    (l) => l.stage === "closed_won" && l.stage_changed_at && l.stage_changed_at >= monthStart
  );
  const revenue = closedWon.reduce((s: number, l: any) => s + (l.proposal_value || 0), 0);
  const target = 100000;

  if (leads.length === 0) return "Comece o dia analisando seus números. Dados são o melhor café da manhã. ☕";
  if (revenue >= target) return "Sua equipe está acima da meta este mês. Continue assim! 🚀";
  if (revenue >= target * 0.6) return "Você está no caminho certo para bater a meta. Foco! 💪";
  return "Ainda dá tempo de virar o mês. Vamos analisar os gargalos. 🔍";
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const timePeriod = useTimePeriod();
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem("onboarding_complete") === "true"
  );

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: teamMembers = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["dashboard-team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["dashboard-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase.
      from("monthly_snapshots").
      select("*").
      order("month_year", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const loading = loadingLeads || loadingTeam;

  const showOnboarding =
  !loading &&
  !onboardingDismissed &&
  profile?.subscription_status === "active" &&
  leads.length === 0 &&
  teamMembers.length === 0;

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setOnboardingDismissed(true)} />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {profile?.full_name?.split(" ")[0] || "Gestor"}! 👋
          </h1>
          <p className="text-base text-muted-foreground">{getSubtitle(leads, snapshots)}</p>
        </div>

        <TimePeriodSelector />

        {loading ?
        <PageSkeleton /> :
        leads.length === 0 ?
        <EmptyState
          icon={Filter}
          title="Seu painel está esperando por dados"
          description="Adicione leads no Funil Completo para começar a ver suas métricas e gráficos."
          actionLabel="Ir para o Funil"
          actionTo="/funil" /> :

        <>
            <DashboardKPIs leads={leads} snapshots={snapshots} timePeriod={timePeriod} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FunnelChart leads={leads} />
              <RevenueChart snapshots={snapshots} leads={leads} timePeriod={timePeriod} />
            </div>
            <DashboardAlerts leads={leads} teamMembers={teamMembers} />
          </>
        }
      </div>
    </DashboardLayout>);
}
