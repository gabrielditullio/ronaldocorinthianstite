import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useEffect, useRef } from "react";

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const toastShown = useRef(false);

  const isAdmin =
    profile?.role === "admin" ||
    profile?.role === "Admin" ||
    profile?.is_admin === true ||
    String(profile?.is_admin) === "true";

  console.log('[DEBUG GUARD] loading:', loading);
  console.log('[DEBUG GUARD] session:', !!session);
  console.log('[DEBUG GUARD] profile loaded:', !!profile);
  console.log('[DEBUG GUARD] role:', profile?.role);
  console.log('[DEBUG GUARD] is_admin:', profile?.is_admin);
  console.log('[DEBUG GUARD] access granted:', isAdmin);

  useEffect(() => {
    if (!loading && profile && session && !isAdmin && !toastShown.current) {
      toastShown.current = true;
      toast.error("Acesso não autorizado");
    }
  }, [loading, session, isAdmin, profile]);

  // Wait for BOTH auth and profile to load before making decisions
  if (loading || (session && !profile)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
