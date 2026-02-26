import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, GripVertical } from "lucide-react";
import type { Lead } from "./types";
import { STAGES, STAGE_BORDER_COLORS, formatBRL, daysInStage } from "./types";

interface Props {
  leads: Lead[];
  memberMap: Record<string, string>;
  onEdit: (lead: Lead) => void;
  onStageChange: (id: string, newStage: string) => void;
}

export function FunnelKanban({ leads, memberMap, onEdit, onStageChange }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.key);
        return (
          <div key={stage.key} className="min-w-[260px] flex-1">
            <div className={`mb-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${stage.color} border`}>
              <span>{stage.label}</span>
              <Badge variant="secondary" className="ml-2 text-xs">{stageLeads.length}</Badge>
            </div>
            <div className="space-y-2">
              {stageLeads.map((lead) => {
                const days = daysInStage(lead.stage_changed_at);
                const isStale = days > 15 && !lead.stage.startsWith("closed");
                return (
                  <Card
                    key={lead.id}
                    className={`cursor-pointer border-l-4 transition-shadow hover:shadow-md ${STAGE_BORDER_COLORS[lead.stage] || ""}`}
                    onClick={() => onEdit(lead)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm leading-tight">{lead.name}</p>
                          {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                        </div>
                        {isStale && (
                          <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0.5">
                            <AlertTriangle className="mr-0.5 h-3 w-3" />{days}d
                          </Badge>
                        )}
                      </div>
                      {lead.assigned_to && memberMap[lead.assigned_to] && (
                        <p className="text-xs text-muted-foreground">👤 {memberMap[lead.assigned_to]}</p>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        {lead.proposal_value ? (
                          <span className="font-medium text-success">{formatBRL(lead.proposal_value)}</span>
                        ) : <span />}
                        {!lead.stage.startsWith("closed") && (
                          <span className="text-muted-foreground">{days}d nesta etapa</span>
                        )}
                      </div>
                      {/* Quick stage change */}
                      {!lead.stage.startsWith("closed") && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select value={lead.stage} onValueChange={(v) => onStageChange(lead.id, v)}>
                            <SelectTrigger className="h-7 text-xs bg-background">
                              <GripVertical className="mr-1 h-3 w-3 text-muted-foreground" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              {STAGES.map((s) => (
                                <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {stageLeads.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Nenhum lead
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
