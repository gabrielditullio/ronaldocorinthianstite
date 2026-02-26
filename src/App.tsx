import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import TeamPage from "./pages/TeamPage";
import FunnelPage from "./pages/FunnelPage";
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
            <Route path="/diagnostics" element={<ProtectedRoute><PlaceholderPage title="Diagnóstico Rápido" /></ProtectedRoute>} />
            <Route path="/sdr-performance" element={<ProtectedRoute><PlaceholderPage title="Performance SDR" /></ProtectedRoute>} />
            <Route path="/closer-performance" element={<ProtectedRoute><PlaceholderPage title="Performance Closer" /></ProtectedRoute>} />
            <Route path="/cac" element={<ProtectedRoute><PlaceholderPage title="Calculadora CAC" /></ProtectedRoute>} />
            <Route path="/goals" element={<ProtectedRoute><PlaceholderPage title="Metas Reversas" /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute><PlaceholderPage title="Reunião de Pipeline" /></ProtectedRoute>} />
            <Route path="/monthly" element={<ProtectedRoute><PlaceholderPage title="Comparativo Mensal" /></ProtectedRoute>} />
            <Route path="/alignment" element={<ProtectedRoute><PlaceholderPage title="Alinhamento SDR-Closer" /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><PlaceholderPage title="Configurações" /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><PlaceholderPage title="Admin" /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
