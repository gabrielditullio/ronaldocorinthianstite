import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Info, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";

const borderColors: Record<string, string> = {
  info: "border-l-blue-500",
  warning: "border-l-orange-500",
  success: "border-l-green-500",
  update: "border-l-purple-500",
};

const typeIcons: Record<string, any> = {
  info: Info, warning: AlertTriangle, success: CheckCircle, update: Sparkles,
};

const typeBadge: Record<string, { label: string; cls: string }> = {
  info: { label: "Info", cls: "bg-blue-100 text-blue-700" },
  warning: { label: "Aviso", cls: "bg-orange-100 text-orange-700" },
  success: { label: "Sucesso", cls: "bg-green-100 text-green-700" },
  update: { label: "Atualização", cls: "bg-purple-100 text-purple-700" },
};

export function NotificationBell() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["user-notifications"],
    queryFn: async () => {
      if (!profile) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];

      // Filter by target
      return (data || []).filter((n: any) => {
        if (n.target === "all") return true;
        if (n.target === "active") return profile.subscription_status === "active";
        if (n.target === "order_bump") return profile.has_order_bump === true;
        if (n.target === "inactive") return profile.subscription_status !== "active";
        return true;
      });
    },
    enabled: !!profile,
    staleTime: 30000,
  });

  const { data: reads = [] } = useQuery({
    queryKey: ["user-notification-reads"],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", profile.id);
      if (error) return [];
      return (data || []).map((r: any) => r.notification_id);
    },
    enabled: !!profile,
    staleTime: 30000,
  });

  const readSet = useMemo(() => new Set(reads), [reads]);
  const unreadCount = notifications.filter((n: any) => !readSet.has(n.id)).length;

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!profile || readSet.has(notificationId)) return;
      const { error } = await supabase.from("notification_reads").insert({
        notification_id: notificationId,
        user_id: profile.id,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notification-reads"] });
    },
  });

  const handleClick = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      markRead.mutate(id);
    }
  };

  if (!profile) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">Notificações</p>
          {unreadCount > 0 && <p className="text-xs text-muted-foreground">{unreadCount} não lida(s)</p>}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma notificação</p>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => {
                const isRead = readSet.has(n.id);
                const isExpanded = expandedId === n.id;
                const Icon = typeIcons[n.type] || Info;
                const badge = typeBadge[n.type] || typeBadge.info;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n.id)}
                    className={`p-3 border-l-4 cursor-pointer transition-colors ${borderColors[n.type] || "border-l-blue-500"} ${
                      !isRead ? "bg-primary/5" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${!isRead ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                          <Badge className={`text-[10px] px-1 py-0 ${badge.cls}`}>{badge.label}</Badge>
                        </div>
                        <p className={`text-xs text-muted-foreground mt-0.5 ${isExpanded ? "" : "line-clamp-1"}`}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
