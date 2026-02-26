import { ReactNode } from "react";
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-[#3D1520] text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-tight">Raio-X Admin</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
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
      <div className="flex-1 bg-[#FAF6F0] flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, {profile?.full_name || profile?.email || "Admin"}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar ao App
              </Link>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
