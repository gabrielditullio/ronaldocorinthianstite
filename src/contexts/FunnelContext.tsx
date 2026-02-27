import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Funnel {
  id: string;
  user_id: string;
  name: string;
  funnel_type: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface FunnelContextType {
  funnels: Funnel[];
  selectedFunnelId: string | null; // null = "Todos os Funis"
  selectedFunnel: Funnel | null;
  setSelectedFunnelId: (id: string | null) => void;
  isLoading: boolean;
  refetchFunnels: () => void;
}

const FunnelContext = createContext<FunnelContextType | null>(null);

const STORAGE_KEY = "raio-x-selected-funnel";

export function FunnelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedFunnelId, setSelectedFunnelIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const { data: funnels = [], isLoading, refetch: refetchFunnels } = useQuery({
    queryKey: ["funnels", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Funnel[];
    },
    enabled: !!user,
  });

  // Auto-select first funnel if none selected or selected is invalid
  useEffect(() => {
    if (funnels.length > 0 && selectedFunnelId) {
      const exists = funnels.some((f) => f.id === selectedFunnelId);
      if (!exists) {
        setSelectedFunnelId(funnels[0].id);
      }
    }
  }, [funnels, selectedFunnelId]);

  const setSelectedFunnelId = (id: string | null) => {
    setSelectedFunnelIdState(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  };

  const selectedFunnel = selectedFunnelId
    ? funnels.find((f) => f.id === selectedFunnelId) || null
    : null;

  return (
    <FunnelContext.Provider
      value={{ funnels, selectedFunnelId, selectedFunnel, setSelectedFunnelId, isLoading, refetchFunnels }}
    >
      {children}
    </FunnelContext.Provider>
  );
}

export function useFunnel() {
  const context = useContext(FunnelContext);
  if (!context) throw new Error("useFunnel must be used within FunnelProvider");
  return context;
}
