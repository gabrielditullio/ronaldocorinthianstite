import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3, Users, FileText, Settings, Download, Bell, HeartPulse, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { label: "📊 Dashboard", path: "/admin", icon: BarChart3 },
  { label: "👥 Usuários", path: "/admin/usuarios", icon: Users },
  { label: "📋 Webhooks", path: "/admin/webhooks", icon: FileText },
  { label: "⚙️ Configurações", path: "/admin/configuracoes", icon: Settings },
  { label: "📤 Exportar Dados", path: "/admin/exportar", icon: Download },
  { label: "🔔 Notificações", path: "/admin/notificacoes", icon: Bell },
  { label: "💚 Saúde do Sistema", path: "/admin/saude", icon: HeartPulse },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#3D1520] text-white flex flex-col shrink-0 transform transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Raio-X Admin</h1>
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 bg-[#FAF6F0] flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 rounded-md hover:bg-muted" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Olá, {profile?.full_name || profile?.email || "Admin"}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Voltar ao App</span>
                <span className="sm:hidden">Voltar</span>
              </Link>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
