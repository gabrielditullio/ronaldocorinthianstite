import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { ShieldAlert, RefreshCw, LogOut, Loader2, ExternalLink } from "lucide-react";

const ASSINY_URL = "https://pay.hotmart.com/SEU_PRODUTO"; // Replace with actual Assiny URL
const POLL_INTERVAL = 30;
const MAX_DURATION = 300; // 5 minutes

export function Paywall() {
  const { refreshProfile, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
  const [checking, setChecking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  }, [refreshProfile]);

  // Watch for profile becoming active
  useEffect(() => {
    if (profile?.subscription_status === "active") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      toast.success("Seu acesso foi ativado! 🎉");
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  // Polling timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= MAX_DURATION) {
          setTimedOut(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return next;
      });
      setCountdown((prev) => {
        if (prev <= 1) {
          checkStatus();
          return POLL_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    // Initial check
    checkStatus();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkStatus]);

  const handleManualCheck = () => {
    setCountdown(POLL_INTERVAL);
    checkStatus();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {checking ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {timedOut ? "Ativação em andamento" : "Seu acesso está sendo ativado..."}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!timedOut ? (
            <>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Estamos verificando seu pagamento automaticamente. Assim que confirmado, você será redirecionado.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Verificando novamente em <span className="text-primary font-bold">{countdown}s</span>
                </p>
                <Progress value={((POLL_INTERVAL - countdown) / POLL_INTERVAL) * 100} className="h-2" />
              </div>
              <Button onClick={handleManualCheck} disabled={checking} className="w-full">
                <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                Verificar Agora
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ainda processando. Se já fez o pagamento, entre em contato:
              </p>
              <div className="text-sm space-y-1">
                <p>
                  📧{" "}
                  <a href="mailto:suporte@raioxcomercial.com.br" className="font-medium text-primary underline">
                    suporte@raioxcomercial.com.br
                  </a>
                </p>
                <p>
                  📱{" "}
                  <a href="https://wa.me/5511999999999" className="font-medium text-primary underline" target="_blank" rel="noopener noreferrer">
                    WhatsApp (11) 99999-9999
                  </a>
                </p>
              </div>
              <Button onClick={handleManualCheck} disabled={checking} variant="outline" className="w-full">
                <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                Verificar Novamente
              </Button>
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Ainda não comprou?</p>
            <Button asChild variant="link" className="text-primary">
              <a href={ASSINY_URL} target="_blank" rel="noopener noreferrer">
                Garantir meu acesso por R$ 67 <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
