import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Trophy } from "lucide-react";
import { leadSourceLabels } from "@/utils/translations";
import type { Lead } from "./types";
import { formatBRL } from "./types";

interface Props {
  leads: Lead[];
}

const SOURCE_COLORS: Record<string, string> = {
  traffic: "bg-blue-500",
  ss: "bg-violet-500",
  bio: "bg-pink-500",
  inbound: "bg-green-500",
  referral: "bg-amber-500",
  outbound: "bg-cyan-500",
  other: "bg-muted-foreground",
};

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

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const src = l.lead_source || "other";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, count]) => ({ key, label: leadSourceLabels[key] || key, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const items = [
    { label: "Total de Leads", value: String(stats.total), icon: Users, iconClass: "text-primary" },
    { label: "Em Pipeline", value: String(stats.inPipeline), icon: TrendingUp, iconClass: "text-accent" },
    { label: "Receita Potencial", value: formatBRL(stats.potentialRevenue), icon: DollarSign, iconClass: "text-success" },
    { label: "Fechados este Mês", value: String(stats.closedThisMonth), icon: Trophy, iconClass: "text-accent" },
  ];

  return (
    <div className="space-y-3">
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

      {/* Source Breakdown */}
      {leads.length > 0 && sourceBreakdown.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">LEADS POR ORIGEM</p>
            <div className="flex flex-wrap gap-3">
              {sourceBreakdown.map((src) => (
                <div key={src.key} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${SOURCE_COLORS[src.key] || SOURCE_COLORS.other}`} />
                  <span className="text-sm text-foreground">{src.label}</span>
                  <span className="text-sm font-semibold">{src.count}</span>
                </div>
              ))}
            </div>
            {/* Stacked bar */}
            <div className="flex h-2 rounded-full overflow-hidden mt-2">
              {sourceBreakdown.map((src) => (
                <div
                  key={src.key}
                  className={`${SOURCE_COLORS[src.key] || SOURCE_COLORS.other}`}
                  style={{ width: `${(src.count / leads.length) * 100}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
