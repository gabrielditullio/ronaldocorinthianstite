import {
  LayoutDashboard, Stethoscope, Filter, UserCheck, Target,
  Calculator, ArrowDownUp, Handshake, BarChart3, Users,
  Settings, ShieldCheck, LogOut, ChevronLeft
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const navGroups = [
  {
    label: "VISÃO GERAL",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Diagnóstico Rápido", url: "/diagnostics", icon: Stethoscope },
    ],
  },
  {
    label: "PIPELINE",
    items: [
      { title: "Funil de Vendas", url: "/funnel", icon: Filter },
      { title: "Performance SDR", url: "/sdr-performance", icon: UserCheck },
      { title: "Performance Closer", url: "/closer-performance", icon: Target },
    ],
  },
  {
    label: "FERRAMENTAS",
    items: [
      { title: "Calculadora CAC", url: "/cac", icon: Calculator },
      { title: "Metas Reversas", url: "/goals", icon: ArrowDownUp },
      { title: "Reunião de Pipeline", url: "/meetings", icon: Handshake },
      { title: "Comparativo Mensal", url: "/monthly", icon: BarChart3 },
      { title: "Alinhamento SDR-Closer", url: "/alignment", icon: ChevronLeft },
    ],
  },
  {
    label: "CONFIGURAR",
    items: [
      { title: "Meu Time", url: "/team", icon: Users },
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div>
              <span className="text-xl font-extrabold text-primary">RAIO-X</span>
              <br />
              <span className="text-sm font-bold text-accent">COMERCIAL</span>
            </div>
          </div>
        )}
        {collapsed && (
          <span className="text-lg font-extrabold text-primary">RX</span>
        )}
      </SidebarHeader>

      <Separator className="mx-2" />

      <SidebarContent className="mt-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {profile?.is_admin && (
          <SidebarGroup>
            <SidebarGroupLabel>ADMIN</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin">
                    <NavLink
                      to="/admin"
                      end
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Separator className="mb-3" />
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{profile?.full_name || "Usuário"}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 h-8 w-8" aria-label="Sair da conta" title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
