import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { Lead } from "./types";
import { STAGES, SOURCES, formatBRL, daysInStage } from "./types";

interface Props {
  leads: Lead[];
  memberMap: Record<string, string>;
  onEdit: (lead: Lead) => void;
}

function stageLabel(key: string) {
  return STAGES.find((s) => s.key === key)?.label ?? key;
}
function stageColor(key: string) {
  return STAGES.find((s) => s.key === key)?.color ?? "";
}
function sourceLabel(key: string | null) {
  if (!key) return "—";
  return SOURCES.find((s) => s.key === key)?.label ?? key;
}

export function FunnelTable({ leads, memberMap, onEdit }: Props) {
  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Nenhum lead encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden md:table-cell">Responsável</TableHead>
              <TableHead className="hidden md:table-cell">Origem</TableHead>
              <TableHead className="hidden lg:table-cell">Dias na Etapa</TableHead>
              <TableHead className="hidden lg:table-cell">Criado em</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => {
              const days = daysInStage(l.stage_changed_at);
              return (
                <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit(l)}>
                  <TableCell className="font-medium">
                    {l.name}
                    {l.lead_source === "traffic" && l.campaign_name && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">📢 {l.campaign_name}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.company || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${stageColor(l.stage)} border`}>{stageLabel(l.stage)}</Badge>
                  </TableCell>
                  <TableCell>{formatBRL(l.proposal_value)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {l.assigned_to && memberMap[l.assigned_to] ? memberMap[l.assigned_to] : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{sourceLabel(l.lead_source)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className={days > 15 && !l.stage.startsWith("closed") ? "font-semibold text-destructive" : "text-muted-foreground"}>
                      {days}d
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {l.created_at ? new Date(l.created_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(l); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
