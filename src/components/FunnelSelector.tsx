import { useFunnel } from "@/contexts/FunnelContext";
import { funnelTypeLabels, funnelTypeColors } from "@/utils/translations";
import { Badge } from "@/components/ui/badge";

import { ChevronDown, Layers, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FunnelSelector({ collapsed }: { collapsed: boolean }) {
  const { funnels, selectedFunnelId, selectedFunnel, setSelectedFunnelId } = useFunnel();
  const navigate = useNavigate();

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center w-full p-2 rounded-md hover:bg-sidebar-accent transition-colors" title={selectedFunnel?.name || "Todos os Funis"}>
            <Layers className="h-4 w-4 text-sidebar-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          {funnels.map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => setSelectedFunnelId(f.id)} className={selectedFunnelId === f.id ? "bg-accent" : ""}>
              <span className="truncate flex-1">{f.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSelectedFunnelId(null)} className={!selectedFunnelId ? "bg-accent" : ""}>
            Todos os Funis
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/funis")}>
            <Settings2 className="h-3.5 w-3.5 mr-2" />Gerenciar Funis →
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-left">
          <Layers className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {selectedFunnel?.name || "Todos os Funis"}
            </p>
            {selectedFunnel && (
              <p className="text-[10px] text-sidebar-foreground/60">
                {funnelTypeLabels[selectedFunnel.funnel_type] || selectedFunnel.funnel_type}
              </p>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-64">
        {funnels.map((f) => (
          <DropdownMenuItem key={f.id} onClick={() => setSelectedFunnelId(f.id)} className={`flex items-center justify-between ${selectedFunnelId === f.id ? "bg-accent" : ""}`}>
            <span className="truncate">{f.name}</span>
            <Badge variant="outline" className={`text-[10px] ml-2 shrink-0 ${funnelTypeColors[f.funnel_type] || ""}`}>
              {funnelTypeLabels[f.funnel_type] || f.funnel_type}
            </Badge>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSelectedFunnelId(null)} className={!selectedFunnelId ? "bg-accent" : ""}>
          Todos os Funis
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/funis")}>
          <Settings2 className="h-3.5 w-3.5 mr-2" />Gerenciar Funis →
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
