import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Lightbulb, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Lead {
  id: string;
  name: string;
  stage: string;
  stage_changed_at: string | null;
  assigned_to: string | null;
  created_at: string | null;
  proposal_value: number | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  monthly_lead_goal: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead", qualification: "Qualificação", meeting: "Meeting",
  proposal: "Proposta", closed_won: "Fechado", closed_lost: "Perdido",
};

function daysInStage(d: string | null): number {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

interface Alert {
  icon: React.ElementType;
  text: string;
  severity: "warning" | "critical" | "info";
}

export function DashboardAlerts({ leads, teamMembers }: { leads: Lead[]; teamMembers: TeamMember[] }) {
  const alerts = useMemo(() => {
    const result: Alert[] = [];

    if (leads.length === 0) {
      result.push({
        icon: Lightbulb,
        text: "Comece adicionando leads no Funil de Vendas para ver métricas aqui",
        severity: "info",
      });
      return result;
    }

    // Stale leads
    const stale = leads
      .filter((l) => !l.stage.startsWith("closed") && daysInStage(l.stage_changed_at) > 15)
      .sort((a, b) => daysInStage(b.stage_changed_at) - daysInStage(a.stage_changed_at))
      .slice(0, 3);

    stale.forEach((l) => {
      result.push({
        icon: AlertTriangle,
        text: `${l.name} está há ${daysInStage(l.stage_changed_at)} dias em ${STAGE_LABELS[l.stage] || l.stage} — investigar`,
        severity: "warning",
      });
    });

    // SDR below goal
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    teamMembers
      .filter((t) => t.role === "SDR" && t.monthly_lead_goal && t.monthly_lead_goal > 0)
      .forEach((sdr) => {
        const assigned = leads.filter(
          (l) => l.assigned_to === sdr.id && l.created_at && l.created_at >= monthStart
        ).length;
        const pct = assigned / (sdr.monthly_lead_goal || 1);
        if (pct < 0.7) {
          result.push({
            icon: TrendingDown,
            text: `${sdr.name} está ${Math.round((1 - pct) * 100)}% abaixo da meta de leads (${assigned}/${sdr.monthly_lead_goal})`,
            severity: "critical",
          });
        }
      });

    // Low conversion
    const thisMonthLeads = leads.filter((l) => l.created_at && l.created_at >= monthStart);
    const closedWon = leads.filter((l) => l.stage === "closed_won" && l.stage_changed_at && l.stage_changed_at >= monthStart);
    if (thisMonthLeads.length >= 5) {
      const rate = (closedWon.length / thisMonthLeads.length) * 100;
      if (rate < 20) {
        result.push({
          icon: TrendingDown,
          text: `Taxa de conversão em ${rate.toFixed(0)}% — abaixo de 20%, revisar processo`,
          severity: "critical",
        });
      }
    }

    return result.slice(0, 5);
  }, [leads, teamMembers]);

  const borderColor: Record<string, string> = {
    warning: "border-l-accent",
    critical: "border-l-destructive",
    info: "border-l-primary",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Alertas e Ações</CardTitle>
        <Link to="/dashboard" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Ver funil <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className={`flex items-start gap-3 rounded-md border-l-4 bg-muted/50 p-3 ${borderColor[alert.severity]}`}>
            <alert.icon className={`mt-0.5 h-4 w-4 shrink-0 ${
              alert.severity === "critical" ? "text-destructive" : alert.severity === "warning" ? "text-accent" : "text-primary"
            }`} />
            <p className="text-sm">{alert.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
