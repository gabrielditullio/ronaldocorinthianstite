import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useState } from "react";

export function GlobalBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["app-settings-banner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["banner_active", "banner_text", "banner_type"]);
      if (error) return null;
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: 30000,
  });

  if (dismissed || !settings || settings.banner_active !== "true" || !settings.banner_text) return null;

  const icon = settings.banner_type === "warning" ? <AlertTriangle className="h-4 w-4" /> :
    settings.banner_type === "success" ? <CheckCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />;

  const variant = settings.banner_type === "warning" ? "destructive" as const : "default" as const;

  return (
    <Alert variant={variant} className="rounded-none border-x-0 border-t-0">
      {icon}
      <AlertDescription className="flex-1">{settings.banner_text}</AlertDescription>
      <button onClick={() => setDismissed(true)} className="ml-auto p-1 hover:opacity-70">
        <X className="h-3 w-3" />
      </button>
    </Alert>
  );
}
