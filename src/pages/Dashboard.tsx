import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { AdherenceCard } from "@/components/dashboard/AdherenceCard";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import OnboardingWizard from "@/components/OnboardingWizard";
import { PageSkeleton, EmptyState } from "@/components/ui/page-states";
import { Camera } from "lucide-react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { user, profile } = useAuth();
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {profile?.full_name || "Gestor"}! 👋
            </h1>
            <p className="text-muted-foreground">Visão geral do seu pipeline comercial</p>
          </div>
          {!loading && leads.length > 0 && (
            <div className="w-48 shrink-0 hidden sm:block">
              <AdherenceCard />
            </div>
          )}
        </div>

        {loading ? (
          <PageSkeleton />
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="Comece inserindo os dados do seu primeiro mês"
            description="Gere um snapshot mensal para visualizar métricas e gráficos no painel."
            actionLabel="Criar Snapshot"
            actionTo="/monthly"
          />
        ) : (
          <>
            <DashboardKPIs leads={leads} snapshots={snapshots} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FunnelChart leads={leads} />
              <RevenueChart snapshots={snapshots} leads={leads} />
            </div>
            <DashboardAlerts leads={leads} teamMembers={teamMembers} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
