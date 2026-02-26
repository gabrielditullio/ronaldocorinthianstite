import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Trophy } from "lucide-react";
import type { Lead } from "./types";
import { formatBRL } from "./types";

interface Props {
  leads: Lead[];
}

export function FunnelSummary({ leads }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const total = leads.length;
    const inPipeline = leads.filter((l) => !l.stage.startsWith("closed")).length;
    const potentialRevenue = leads
      .filter((l) => l.stage === "proposal")
      .reduce((s, l) => s + (l.proposal_value || 0), 0);
    const closedThisMonth = leads.filter(
      (l) => l.stage === "closed_won" && l.stage_changed_at && l.stage_changed_at >= monthStart
    ).length;
    return { total, inPipeline, potentialRevenue, closedThisMonth };
  }, [leads]);

  const items = [
    { label: "Total de Leads", value: String(stats.total), icon: Users, iconClass: "text-primary" },
    { label: "Em Pipeline", value: String(stats.inPipeline), icon: TrendingUp, iconClass: "text-accent" },
    { label: "Receita Potencial", value: formatBRL(stats.potentialRevenue), icon: DollarSign, iconClass: "text-success" },
    { label: "Fechados este Mês", value: String(stats.closedThisMonth), icon: Trophy, iconClass: "text-accent" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${item.iconClass}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
