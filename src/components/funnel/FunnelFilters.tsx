import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Filters } from "./types";
import { SOURCES } from "./types";

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  teamMembers: { id: string; name: string }[];
}

export function FunnelFilters({ filters, setFilters, teamMembers }: Props) {
  const hasFilters = filters.assignedTo || filters.source || filters.stages.length > 0 || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[160px]">
        <label className="mb-1 block text-xs text-muted-foreground">Responsável</label>
        <Select value={filters.assignedTo || "all"} onValueChange={(v) => setFilters({ ...filters, assignedTo: v === "all" ? "" : v })}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            <SelectItem value="all">Todos</SelectItem>
            {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[140px]">
        <label className="mb-1 block text-xs text-muted-foreground">Origem</label>
        <Select value={filters.source || "all"} onValueChange={(v) => setFilters({ ...filters, source: v === "all" ? "" : v })}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            <SelectItem value="all">Todas</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">De</label>
        <Input type="date" className="w-[140px] bg-background" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Até</label>
        <Input type="date" className="w-[140px] bg-background" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => setFilters({ assignedTo: "", source: "", stages: [], dateFrom: "", dateTo: "" })}>
          <X className="mr-1 h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );
}
