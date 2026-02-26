import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { User, Building2, Target, CreditCard, Shield, Loader2, Save, LogOut, KeyRound } from "lucide-react";

export default function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();

  // Profile
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Goals
  const [revenueGoal, setRevenueGoal] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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
    if (error) {
      toast.error("Erro ao salvar perfil.");
    } else {
      toast.success("Perfil atualizado com sucesso!");
      refreshProfile();
    }
  };

  const handleSaveGoals = () => {
    localStorage.setItem("default_revenue_goal", revenueGoal);
    toast.success("Metas salvas com sucesso!");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error("Erro ao alterar senha.");
    } else {
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, "");
    if (!num) return "";
    return (parseInt(num) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Configurações</h1>

        {/* PERFIL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" /> Perfil
            </CardTitle>
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" /> Metas Padrão
            </CardTitle>
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

        {/* ASSINATURA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" /> Assinatura
            </CardTitle>
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
                {profile?.subscription_activated_at
                  ? new Date(profile.subscription_activated_at).toLocaleDateString("pt-BR")
                  : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Transação Hotmart:</span>{" "}
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" /> Conta
            </CardTitle>
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
    </DashboardLayout>
  );
}
