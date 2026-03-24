import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FunnelProvider } from "@/contexts/FunnelContext";
import { TimePeriodProvider } from "@/contexts/TimePeriodContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import SettingsPage from "./pages/SettingsPage";
import TeamPage from "./pages/TeamPage";
import FullFunnelPage from "./pages/FullFunnelPage";
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

import FunnelManagementPage from "./pages/FunnelManagementPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminHealthPage from "./pages/admin/AdminHealthPage";
import AdminWebhooksPage from "./pages/admin/AdminWebhooksPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminExportPage from "./pages/admin/AdminExportPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";
import AdminDemoDataPage from "./pages/admin/AdminDemoDataPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if ([401, 403, 429].includes(error?.status)) return false;
        return failureCount < 1;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FunnelProvider>
          <TimePeriodProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/funil" element={<ProtectedRoute><FullFunnelPage /></ProtectedRoute>} />
            <Route path="/funis" element={<ProtectedRoute><FunnelManagementPage /></ProtectedRoute>} />
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
            <Route path="/admin/webhooks" element={<AdminRouteGuard><AdminWebhooksPage /></AdminRouteGuard>} />
            <Route path="/admin/configuracoes" element={<AdminRouteGuard><AdminSettingsPage /></AdminRouteGuard>} />
            <Route path="/admin/exportar" element={<AdminRouteGuard><AdminExportPage /></AdminRouteGuard>} />
            <Route path="/admin/notificacoes" element={<AdminRouteGuard><AdminNotificationsPage /></AdminRouteGuard>} />
            <Route path="/admin/saude" element={<AdminRouteGuard><AdminHealthPage /></AdminRouteGuard>} />
            <Route path="/admin/demo-data" element={<AdminRouteGuard><AdminDemoDataPage /></AdminRouteGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </TimePeriodProvider>
          </FunnelProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
