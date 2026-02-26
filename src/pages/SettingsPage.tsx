import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User, Building2, Target, CreditCard, Shield, Loader2, Save, LogOut, KeyRound, Database, Trash2, Download } from "lucide-react";

function daysAgo(d: number) {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString();
}

function monthYear(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [revenueGoal, setRevenueGoal] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [loadingSample, setLoadingSample] = useState(false);
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCompanyName(profile.company_name || "");
      setPhone(profile.phone || "");
    }
    const saved = localStorage.getItem("default_revenue_goal");
    if (saved) setRevenueGoal(saved);
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, company_name: companyName, phone })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (error) toast.error("Erro ao salvar perfil.");
    else { toast.success("Perfil atualizado com sucesso!"); refreshProfile(); }
  };

  const handleSaveGoals = () => {
    localStorage.setItem("default_revenue_goal", revenueGoal);
    toast.success("Metas salvas com sucesso!");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem."); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error("Erro ao alterar senha.");
    else { toast.success("Senha alterada com sucesso!"); setNewPassword(""); setConfirmPassword(""); }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, "");
    if (!num) return "";
    return (parseInt(num) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  };

  const handleLoadSample = async () => {
    if (!user) return;
    setLoadingSample(true);
    setShowSampleDialog(false);
    const uid = user.id;

    try {
      // 1. Team members
      const teamRows = [
        { name: "João Silva", role: "sdr", user_id: uid },
        { name: "Maria Costa", role: "sdr", user_id: uid },
        { name: "Bruno Santos", role: "sdr", user_id: uid },
        { name: "Ana Ferreira", role: "closer", user_id: uid },
        { name: "Carlos Mendes", role: "closer", user_id: uid },
        { name: "Felipe Gomes", role: "closer", user_id: uid },
      ];
      const { data: teamData } = await supabase.from("team_members").insert(teamRows).select("id, role");
      const sdrIds = teamData?.filter((t) => t.role === "sdr").map((t) => t.id) || [];
      const closerIds = teamData?.filter((t) => t.role === "closer").map((t) => t.id) || [];
      const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

      // 2. Leads
      const sources = ["Google Ads", "Indicação", "LinkedIn", "Site", "Instagram"];
      const leadRows = [
        { name: "Ricardo Souza", company: "TechBrasil Ltda", stage: "lead", lead_source: sources[0], created_at: daysAgo(28), stage_changed_at: daysAgo(28), assigned_to: pick(sdrIds) },
        { name: "Luciana Martins", company: "Grupo Nova Era", stage: "lead", lead_source: sources[1], created_at: daysAgo(25), stage_changed_at: daysAgo(25), assigned_to: pick(sdrIds) },
        { name: "Pedro Henrique", company: "StartUp Flow", stage: "lead", lead_source: sources[2], created_at: daysAgo(20), stage_changed_at: daysAgo(20), assigned_to: pick(sdrIds) },
        { name: "Beatriz Lima", company: "Conecta Digital", stage: "lead", lead_source: sources[3], created_at: daysAgo(5), stage_changed_at: daysAgo(5), assigned_to: pick(sdrIds) },
        { name: "Fernando Rocha", company: "Alfa Serviços", stage: "qualification", lead_source: sources[4], created_at: daysAgo(22), stage_changed_at: daysAgo(15), assigned_to: pick(sdrIds), previous_stage: "lead" },
        { name: "Gabriela Nunes", company: "MegaSoft", stage: "qualification", lead_source: sources[0], created_at: daysAgo(18), stage_changed_at: daysAgo(12), assigned_to: pick(sdrIds), previous_stage: "lead" },
        { name: "André Campos", company: "DataPrime", stage: "qualification", lead_source: sources[1], created_at: daysAgo(15), stage_changed_at: daysAgo(10), assigned_to: pick(sdrIds), previous_stage: "lead" },
        { name: "Mariana Alves", company: "VisionTech", stage: "meeting", lead_source: sources[2], created_at: daysAgo(20), stage_changed_at: daysAgo(8), assigned_to: pick(closerIds), previous_stage: "qualification" },
        { name: "Thiago Barbosa", company: "Inova Plus", stage: "meeting", lead_source: sources[3], created_at: daysAgo(18), stage_changed_at: daysAgo(7), assigned_to: pick(closerIds), previous_stage: "qualification" },
        { name: "Camila Rodrigues", company: "BrightCore SA", stage: "meeting", lead_source: sources[4], created_at: daysAgo(14), stage_changed_at: daysAgo(5), assigned_to: pick(closerIds), previous_stage: "qualification" },
        { name: "Rafael Costa", company: "NexGen Brasil", stage: "proposal", lead_source: sources[0], created_at: daysAgo(25), stage_changed_at: daysAgo(4), assigned_to: pick(closerIds), previous_stage: "meeting", proposal_value: 12000 },
        { name: "Juliana Pereira", company: "SoluçõesPro", stage: "proposal", lead_source: sources[1], created_at: daysAgo(20), stage_changed_at: daysAgo(3), assigned_to: pick(closerIds), previous_stage: "meeting", proposal_value: 8500 },
        { name: "Marcos Teixeira", company: "Alpha Digital", stage: "proposal", lead_source: sources[2], created_at: daysAgo(16), stage_changed_at: daysAgo(2), assigned_to: pick(closerIds), previous_stage: "meeting", proposal_value: 15000 },
        { name: "Patrícia Santos", company: "Grupo Estrela", stage: "closed_won", lead_source: sources[3], created_at: daysAgo(30), stage_changed_at: daysAgo(1), assigned_to: pick(closerIds), previous_stage: "proposal", proposal_value: 18000 },
        { name: "Diego Oliveira", company: "VenturaTech", stage: "closed_won", lead_source: sources[4], created_at: daysAgo(28), stage_changed_at: daysAgo(1), assigned_to: pick(closerIds), previous_stage: "proposal", proposal_value: 9500 },
      ].map((l) => ({ ...l, user_id: uid }));
      await supabase.from("leads").insert(leadRows);

      // 3. Diagnostic
      await supabase.from("diagnostics").insert({
        user_id: uid, month_year: monthYear(0),
        q1_leads_per_week: 3, q2_lead_to_meeting: 35, q3_meeting_to_proposal: 40,
        q4_proposal_to_close: 25, q5_team_knows_goals: 4, q6_weekly_data_review: 3, q7_sdr_closer_sla: 3,
        total_score: 22,
      });

      // 4. Monthly snapshots
      await supabase.from("monthly_snapshots").insert([
        { user_id: uid, month_year: monthYear(1), leads_generated: 20, qualification_rate: 30, meetings_booked: 6, proposals_sent: 4, close_rate: 15, deals_closed: 3, total_revenue: 28000, avg_ticket: 9333, cac: 3500, ltv_cac_ratio: 3.2 },
        { user_id: uid, month_year: monthYear(0), leads_generated: 25, qualification_rate: 35, meetings_booked: 8, proposals_sent: 5, close_rate: 18, deals_closed: 4, total_revenue: 42000, avg_ticket: 10500, cac: 3200, ltv_cac_ratio: 3.9 },
      ]);

      // 5. CAC
      await supabase.from("cac_calculations").insert({
        user_id: uid, month_year: monthYear(0),
        marketing_investment: 5000, sales_investment: 6000, tools_investment: 2000,
        total_investment: 13000, new_clients: 4, cac: 3250, avg_ticket: 10500, payback_months: 0.31,
      });

      localStorage.setItem("onboarding_complete", "true");
      queryClient.invalidateQueries();
      toast.success("Dados de exemplo carregados! Explore o dashboard.");
    } catch {
      toast.error("Erro ao carregar dados de exemplo.");
    }
    setLoadingSample(false);
  };

  const handleClearData = async () => {
    if (!user) return;
    setClearing(true);
    setShowClearDialog(false);
    setClearConfirmText("");
    const uid = user.id;
    try {
      await Promise.all([
        supabase.from("leads").delete().eq("user_id", uid),
        supabase.from("team_members").delete().eq("user_id", uid),
        supabase.from("diagnostics").delete().eq("user_id", uid),
        supabase.from("monthly_snapshots").delete().eq("user_id", uid),
        supabase.from("cac_calculations").delete().eq("user_id", uid),
        supabase.from("pipeline_meetings").delete().eq("user_id", uid),
      ]);
      localStorage.removeItem("onboarding_complete");
      queryClient.invalidateQueries();
      toast.success("Todos os dados foram removidos.");
    } catch {
      toast.error("Erro ao limpar dados.");
    }
    setClearing(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Configurações</h1>

        {/* PERFIL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" /> Perfil</CardTitle>
            <CardDescription>Informações pessoais e da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Empresa</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Perfil
            </Button>
          </CardContent>
        </Card>

        {/* METAS PADRÃO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5" /> Metas Padrão</CardTitle>
            <CardDescription>Valores utilizados no Dashboard e Metas Reversas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Meta de Faturamento Mensal (R$)</Label>
              <Input
                value={revenueGoal ? `R$ ${formatCurrency(revenueGoal)}` : ""}
                onChange={(e) => setRevenueGoal(e.target.value.replace(/\D/g, ""))}
                placeholder="R$ 0,00"
              />
            </div>
            <Button onClick={handleSaveGoals} variant="secondary">
              <Save className="mr-2 h-4 w-4" /> Salvar Metas
            </Button>
          </CardContent>
        </Card>

        {/* DADOS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Database className="h-5 w-5" /> Dados</CardTitle>
            <CardDescription>Carregar dados de exemplo ou limpar todos os dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setShowSampleDialog(true)} disabled={loadingSample} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loadingSample ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Carregar Dados de Exemplo
              </Button>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setShowClearDialog(true)} disabled={clearing}>
                {clearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Limpar Todos os Dados
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ASSINATURA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5" /> Assinatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge variant={profile?.subscription_status === "active" ? "default" : "destructive"}>
                  {profile?.subscription_status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Ativado em:</span>{" "}
                {profile?.subscription_activated_at ? new Date(profile.subscription_activated_at).toLocaleDateString("pt-BR") : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Transação Assiny:</span>{" "}
                {profile?.hotmart_transaction_id || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Order Bump:</span>{" "}
                {profile?.has_order_bump ? "Sim" : "Não"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CONTA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5" /> Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">
                {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Alterar Senha
              </Button>
            </div>
            <Separator />
            <Button variant="destructive" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sample data dialog */}
      <AlertDialog open={showSampleDialog} onOpenChange={setShowSampleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Carregar dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão criados 6 membros da equipe, 15 leads, diagnósticos, snapshots mensais e cálculo de CAC com dados realistas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadSample}>Carregar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear data dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={(open) => { setShowClearDialog(open); if (!open) setClearConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os leads, membros da equipe, diagnósticos, snapshots e reuniões serão excluídos. Digite <strong>LIMPAR</strong> para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6">
            <Input value={clearConfirmText} onChange={(e) => setClearConfirmText(e.target.value)} placeholder='Digite "LIMPAR"' />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={clearConfirmText !== "LIMPAR"} onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
