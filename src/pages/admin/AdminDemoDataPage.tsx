import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { seedDemoData, cleanDemoData, SEED_STEPS } from "@/lib/demo-seed";
import { Rocket, Trash2, Check, Loader2, FlaskConical } from "lucide-react";

export default function AdminDemoDataPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [seedDone, setSeedDone] = useState(false);

  const handleSeed = async () => {
    if (!user || !confirmed) return;
    setRunning(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setSeedDone(false);
    try {
      // Validate session before starting
      const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
        setRunning(false);
        return;
      }
      await seedDemoData(session.user.id, (stepIdx) => {
        setCurrentStep(stepIdx);
        setCompletedSteps(prev => {
          const next = [...prev];
          if (stepIdx > 0 && !next.includes(stepIdx - 1)) next.push(stepIdx - 1);
          return next;
        });
      });
      // Mark last step done
      setCompletedSteps(prev => [...prev, SEED_STEPS.length - 1]);
      setCurrentStep(SEED_STEPS.length);
      setSeedDone(true);
      toast({ title: "✅ Dados demo criados com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao popular dados", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
      setConfirmed(false);
    }
  };

  const handleClean = async () => {
    if (!user || !confirmed) return;
    setCleaning(true);
    try {
      await cleanDemoData(user.id);
      toast({ title: "Dados demo removidos com sucesso!" });
      setSeedDone(false);
      setCompletedSteps([]);
      setCurrentStep(-1);
    } catch (err: any) {
      toast({ title: "Erro ao limpar dados", description: err.message, variant: "destructive" });
    } finally {
      setCleaning(false);
      setConfirmed(false);
    }
  };

  const busy = running || cleaning;

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-7 w-7 text-[#7c3043]" />
          <h1 className="text-2xl font-bold">Dados Demo</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Popular banco de dados com dados realistas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              ⚠️ Atenção: os dados demo serão vinculados à sua conta. Você pode limpá-los a qualquer momento.
            </p>

            <div className="flex items-center gap-2">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                disabled={busy}
              />
              <label htmlFor="confirm" className="text-sm cursor-pointer select-none">
                Confirmo que quero popular/limpar os dados
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-[#7c3043] hover:bg-[#5e2434] text-white"
                onClick={handleSeed}
                disabled={!confirmed || busy}
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
                🚀 Popular Dados de Demonstração
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleClean}
                disabled={!confirmed || busy}
              >
                {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                🗑️ Limpar Todos os Dados Demo
              </Button>
            </div>

            {/* Progress */}
            {(currentStep >= 0) && (
              <div className="space-y-2 pt-2 border-t">
                {SEED_STEPS.map((label, idx) => {
                  const done = completedSteps.includes(idx);
                  const active = currentStep === idx && !done;
                  return (
                    <div key={idx} className={`flex items-center gap-2 text-sm ${done ? "text-green-700" : active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {done ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#7c3043]" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      {label} {done && "✓"}
                    </div>
                  );
                })}
                {seedDone && (
                  <div className="pt-3 flex flex-col gap-2">
                    <p className="text-green-700 font-semibold">✅ Dados demo criados com sucesso!</p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                      Ver Dashboard →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
