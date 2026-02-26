import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Paywall } from "@/components/Paywall";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { GlobalBanner } from "@/components/GlobalBanner";
import { Loader2 } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile && profile.subscription_status !== "active") {
    return <Paywall />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <GlobalBanner />
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger aria-label="Abrir menu" />
          </header>
          <main className="flex-1 p-4 sm:p-6 animate-fade-in">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
