import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { Loader2 } from "lucide-react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { user, profile } = useAuth();

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: teamMembers = [] } = useQuery({
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

  const loading = loadingLeads;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {profile?.full_name || "Gestor"}! 👋
          </h1>
          <p className="text-muted-foreground">Visão geral do seu pipeline comercial</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
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
