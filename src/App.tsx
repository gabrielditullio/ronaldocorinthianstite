import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import SettingsPage from "./pages/SettingsPage";
import TeamPage from "./pages/TeamPage";
import FunnelPage from "./pages/FunnelPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import SDRPerformancePage from "./pages/SDRPerformancePage";
import CloserPerformancePage from "./pages/CloserPerformancePage";
import CACPage from "./pages/CACPage";
import GoalsPage from "./pages/GoalsPage";
import MeetingsPage from "./pages/MeetingsPage";
import MonthlyPage from "./pages/MonthlyPage";
import AlignmentPage from "./pages/AlignmentPage";
import GoalSimulatorPage from "./pages/GoalSimulatorPage";
import BenchmarksPage from "./pages/BenchmarksPage";
import PaidTrafficPage from "./pages/PaidTrafficPage";
import SellerKPIsPage from "./pages/SellerKPIsPage";
import ChannelsPage from "./pages/ChannelsPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPlaceholderPage from "./pages/admin/AdminPlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/funnel" element={<ProtectedRoute><FunnelPage /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
            <Route path="/diagnostics" element={<ProtectedRoute><DiagnosticsPage /></ProtectedRoute>} />
            <Route path="/sdr-performance" element={<ProtectedRoute><SDRPerformancePage /></ProtectedRoute>} />
            <Route path="/closer-performance" element={<ProtectedRoute><CloserPerformancePage /></ProtectedRoute>} />
            <Route path="/cac" element={<ProtectedRoute><CACPage /></ProtectedRoute>} />
            <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
            <Route path="/monthly" element={<ProtectedRoute><MonthlyPage /></ProtectedRoute>} />
            <Route path="/alignment" element={<ProtectedRoute><AlignmentPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/simulador-metas" element={<ProtectedRoute><GoalSimulatorPage /></ProtectedRoute>} />
            <Route path="/benchmarks" element={<ProtectedRoute><BenchmarksPage /></ProtectedRoute>} />
            <Route path="/trafego-pago" element={<ProtectedRoute><PaidTrafficPage /></ProtectedRoute>} />
            <Route path="/kpis-vendedores" element={<ProtectedRoute><SellerKPIsPage /></ProtectedRoute>} />
            <Route path="/canais" element={<ProtectedRoute><ChannelsPage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRouteGuard><AdminDashboardPage /></AdminRouteGuard>} />
            <Route path="/admin/usuarios" element={<AdminRouteGuard><AdminUsersPage /></AdminRouteGuard>} />
            <Route path="/admin/webhooks" element={<AdminRouteGuard><AdminPlaceholderPage title="Webhooks" /></AdminRouteGuard>} />
            <Route path="/admin/configuracoes" element={<AdminRouteGuard><AdminPlaceholderPage title="Configurações" /></AdminRouteGuard>} />
            <Route path="/admin/exportar" element={<AdminRouteGuard><AdminPlaceholderPage title="Exportar Dados" /></AdminRouteGuard>} />
            <Route path="/admin/notificacoes" element={<AdminRouteGuard><AdminPlaceholderPage title="Notificações" /></AdminRouteGuard>} />
            <Route path="/admin/saude" element={<AdminRouteGuard><AdminPlaceholderPage title="Saúde do Sistema" /></AdminRouteGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
