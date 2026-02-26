import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Loader2, ArrowRight, X, Sparkles, Users, Target } from "lucide-react";

const SAMPLE_LEADS = [
  { name: "Carlos Mendes", company: "TechSoft Ltda", stage: "lead" },
  { name: "Ana Paula Silva", company: "Inova Digital", stage: "lead" },
  { name: "Roberto Almeida", company: "Grupo Estrela", stage: "qualification" },
  { name: "Fernanda Costa", company: "MegaPlan SA", stage: "qualification" },
  { name: "Lucas Pereira", company: "DataFlow", stage: "meeting" },
  { name: "Juliana Santos", company: "BrightCore", stage: "meeting" },
  { name: "Marcos Oliveira", company: "VenturaTech", stage: "proposal" },
  { name: "Patrícia Lima", company: "SoluçõesPro", stage: "proposal" },
  { name: "Thiago Rocha", company: "NexGen Brasil", stage: "closed_won" },
  { name: "Camila Ferreira", company: "Alpha Serviços", stage: "closed_lost" },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [companyName, setCompanyName] = useState("");

  // Step 2
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [members, setMembers] = useState<{ name: string; role: string }[]>([]);

  // Step 3
  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadStage, setLeadStage] = useState("lead");

  const addMember = () => {
    if (!memberName.trim() || !memberRole) return;
    setMembers([...members, { name: memberName.trim(), role: memberRole }]);
    setMemberName("");
    setMemberRole("");
  };

  const removeMember = (i: number) => setMembers(members.filter((_, idx) => idx !== i));

  const handleStep1 = async () => {
    if (!companyName.trim()) { toast.error("Informe o nome da empresa."); return; }
    setSaving(true);
    await supabase.from("profiles").update({ company_name: companyName.trim() }).eq("id", user!.id);
    setSaving(false);
    setStep(2);
  };

  const handleStep2 = async () => {
    if (members.length === 0) { toast.error("Adicione pelo menos 1 membro."); return; }
    setSaving(true);
    const rows = members.map((m) => ({ name: m.name, role: m.role, user_id: user!.id }));
    const { error } = await supabase.from("team_members").insert(rows);
    if (error) toast.error("Erro ao salvar equipe.");
    setSaving(false);
    setStep(3);
  };

  const handleFinish = async (useSample: boolean) => {
    setSaving(true);
    if (useSample) {
      const rows = SAMPLE_LEADS.map((l) => ({ ...l, user_id: user!.id }));
      await supabase.from("leads").insert(rows);
    } else {
      if (!leadName.trim()) { toast.error("Informe o nome do lead."); setSaving(false); return; }
      await supabase.from("leads").insert([{
        name: leadName.trim(),
        company: leadCompany.trim() || null,
        stage: leadStage,
        user_id: user!.id,
      }]);
    }
    localStorage.setItem("onboarding_complete", "true");
    await refreshProfile();
    setSaving(false);
    toast.success("Tudo pronto! Bem-vindo ao Raio-X Comercial 🚀");
    onComplete();
    navigate("/dashboard");
  };

  const stepIcons = [<Target key={1} className="h-5 w-5" />, <Users key={2} className="h-5 w-5" />, <Sparkles key={3} className="h-5 w-5" />];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 sm:gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center justify-center rounded-full text-sm font-bold transition-colors h-3 w-3 sm:h-9 sm:w-9 ${
                s === step
                  ? "bg-primary text-primary-foreground sm:text-sm text-[0px]"
                  : s < step
                  ? "bg-primary/40 sm:bg-primary/20 text-primary sm:text-sm text-[0px]"
                  : "bg-muted text-muted-foreground sm:text-sm text-[0px]"
              }`}
            >
              <span className="hidden sm:inline">{s}</span>
            </div>
          ))}
        </div>

        <Card className="border-2">
          <CardContent className="pt-8 pb-8 space-y-6">
            {step === 1 && (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Bem-vindo ao Raio-X Comercial! 🎯</h2>
                  <p className="text-muted-foreground">
                    Vamos configurar seu painel em 3 minutos. Primeiro, me conta: como se chama sua empresa?
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Minha Empresa Ltda"
                    autoFocus
                  />
                </div>
                <Button className="w-full" onClick={handleStep1} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Monte seu time 👥</h2>
                  <p className="text-muted-foreground">
                    Adicione pelo menos 1 SDR e 1 Closer. Pode ser só o nome por enquanto.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Nome"
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && addMember()}
                  />
                  <Select value={memberRole} onValueChange={setMemberRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sdr">SDR</SelectItem>
                      <SelectItem value="closer">Closer</SelectItem>
                      <SelectItem value="manager">Gestor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" onClick={addMember} disabled={!memberName.trim() || !memberRole}>
                    +
                  </Button>
                </div>

                {members.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {members.map((m, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 py-1 px-3 text-sm">
                        {m.name} ({m.role})
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeMember(i)} />
                      </Badge>
                    ))}
                  </div>
                )}

                <Button className="w-full" onClick={handleStep2} disabled={saving || members.length === 0}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Adicione seu primeiro lead ✨</h2>
                  <p className="text-muted-foreground">
                    Registre um lead real ou use nosso exemplo. Depois disso, seu Raio-X estará funcionando.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nome do Lead</Label>
                    <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Ex: João da Silva" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} placeholder="Opcional" />
                    </div>
                    <div className="space-y-2">
                      <Label>Estágio</Label>
                      <Select value={leadStage} onValueChange={setLeadStage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="qualification">Qualificação</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="proposal">Proposta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button className="w-full" onClick={() => handleFinish(false)} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Começar a usar o Raio-X
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => handleFinish(true)} disabled={saving}>
                    Usar dados de exemplo (10 leads)
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
