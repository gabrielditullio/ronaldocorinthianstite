import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, RefreshCw, LogOut } from "lucide-react";

export function Paywall() {
  const { refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <ShieldAlert className="h-8 w-8 text-accent" />
          </div>
          <CardTitle className="text-xl">Acesso Pendente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Seu acesso ainda não foi ativado. Após a confirmação do pagamento, seu acesso será liberado automaticamente em até 5 minutos. Se já pagou, aguarde ou entre em contato:{" "}
            <a href="mailto:suporte@raioxcomercial.com.br" className="font-medium text-primary underline">
              suporte@raioxcomercial.com.br
            </a>
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleCheck} disabled={checking} className="w-full">
              <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              Verificar novamente
            </Button>
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
