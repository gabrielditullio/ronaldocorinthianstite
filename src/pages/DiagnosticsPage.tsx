import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

function getMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getPrevMonthYear(my: string): string {
  const [y, m] = my.split("-").map(Number);
  let pm = m - 1, py = y;
  if (pm === 0) { pm = 12; py--; }
  return `${py}-${String(pm).padStart(2, "0")}`;
}

function monthLabel(my: string): string {
  const [y, m] = my.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m, 10) - 1]}/${y}`;
}

const QUESTIONS = [
  {
    key: "q1_leads_per_week" as const,
    text: "Quantos leads sua equipe gera por semana?",
    options: ["Menos de 5", "5-15", "15-30", "30-50", "Mais de 50"],
  },
  {
    key: "q2_lead_to_meeting" as const,
    text: "Qual % dos seus leads vira reunião agendada?",
    options: ["Menos de 20%", "20-35%", "35-50%", "50-65%", "Mais de 65%"],
  },
  {
    key: "q3_meeting_to_proposal" as const,
    text: "Qual % das reuniões vira proposta?",
    options: ["Menos de 25%", "25-40%", "40-55%", "55-70%", "Mais de 70%"],
  },
  {
    key: "q4_proposal_to_close" as const,
    text: "Qual % das propostas vira fechamento?",
    options: ["Menos de 30%", "30-45%", "45-60%", "60-75%", "Mais de 75%"],
  },
  {
    key: "q5_team_knows_goals" as const,
    text: "Seus vendedores sabem a meta individual deles?",
    options: ["Não fazem ideia", "Têm uma noção", "Sabem a meta do time", "Sabem a individual", "Acompanham diariamente"],
  },
  {
    key: "q6_weekly_data_review" as const,
    text: "Você analisa dados de vendas toda semana?",
    options: ["Nunca", "Raramente", "Quinzenalmente", "Semanalmente", "Diariamente"],
  },
  {
    key: "q7_sdr_closer_sla" as const,
    text: "Você tem SLA claro entre SDR e Closer?",
    options: ["Não existe", "Informal", "Documentado mas não seguido", "Documentado e seguido", "Monitorado com métricas"],
  },
];

type AnswerKey = typeof QUESTIONS[number]["key"];
type Answers = Record<AnswerKey, number | null>;

const emptyAnswers: Answers = {
  q1_leads_per_week: null, q2_lead_to_meeting: null, q3_meeting_to_proposal: null,
  q4_proposal_to_close: null, q5_team_knows_goals: null, q6_weekly_data_review: null,
  q7_sdr_closer_sla: null,
};

const BUTTON_COLORS = [
  "bg-destructive/80 text-destructive-foreground hover:bg-destructive",
  "bg-accent/80 text-accent-foreground hover:bg-accent",
  "bg-warning/80 text-warning-foreground hover:bg-warning",
  "bg-success/60 text-success-foreground hover:bg-success/80",
  "bg-success text-success-foreground hover:bg-success/90",
];

function calcScore(a: Answers): number {
  const vals = Object.values(a).filter((v): v is number => v !== null);
  if (vals.length < 7) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / 7) * 20);
}

function scoreColor(score: number) {
  if (score >= 85) return { bg: "bg-success", text: "text-success", label: "🟢 OPERAÇÃO SAUDÁVEL", desc: "Sua base é sólida. Foco agora é escalar volume." };
  if (score >= 70) return { bg: "bg-warning", text: "text-warning", label: "🟡 POTENCIAL, MAS TEM FURO", desc: "Há pontos cegos no funil. Identifique qual etapa sangra." };
  return { bg: "bg-destructive", text: "text-destructive", label: "🔴 OPERAÇÃO EM CRISE", desc: "Falta visibilidade. Comece preenchendo o Funil de Vendas por 1 semana." };
}

export default function DiagnosticsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentMY = getMonthYear();
  const prevMY = getPrevMonthYear(currentMY);

  const [answers, setAnswers] = useState<Answers>({ ...emptyAnswers });
  const [showResult, setShowResult] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["diagnostics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostics")
        .select("*")
        .order("month_year", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Pre-fill if current month exists
  useEffect(() => {
    const current = history.find((h) => h.month_year === currentMY);
    if (current) {
      setAnswers({
        q1_leads_per_week: current.q1_leads_per_week,
        q2_lead_to_meeting: current.q2_lead_to_meeting,
        q3_meeting_to_proposal: current.q3_meeting_to_proposal,
        q4_proposal_to_close: current.q4_proposal_to_close,
        q5_team_knows_goals: current.q5_team_knows_goals,
        q6_weekly_data_review: current.q6_weekly_data_review,
        q7_sdr_closer_sla: current.q7_sdr_closer_sla,
      });
      setExistingId(current.id);
      setShowResult(true);
    }
  }, [history, currentMY]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const score = calcScore(answers);
      const payload = {
        ...answers,
        total_score: score,
        month_year: currentMY,
        user_id: user!.id,
      };
      if (existingId) {
        const { error } = await supabase.from("diagnostics").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("diagnostics").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnostics"] });
      setShowResult(true);
      toast.success("Diagnóstico salvo!");
    },
    onError: () => toast.error("Erro ao salvar diagnóstico."),
  });

  const answered = Object.values(answers).filter((v) => v !== null).length;
  const progress = (answered / 7) * 100;
  const allAnswered = answered === 7;
  const score = calcScore(answers);
  const prevDiag = history.find((h) => h.month_year === prevMY);
  const prevScore = prevDiag?.total_score;
  const scoreDiff = prevScore != null ? score - prevScore : null;
  const si = scoreColor(score);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico Rápido</h1>
          <p className="text-muted-foreground">Avalie a saúde da sua operação comercial em 7 perguntas</p>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{answered}/7 respondidas</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Questions */}
        {QUESTIONS.map((q, qi) => (
          <Card key={q.key}>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium text-sm">
                <span className="text-muted-foreground mr-2">{qi + 1}.</span>
                {q.text}
              </p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt, oi) => {
                  const val = oi + 1;
                  const selected = answers[q.key] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setAnswers({ ...answers, [q.key]: val })}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                        selected
                          ? `${BUTTON_COLORS[oi]} border-transparent shadow-sm`
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {val}. {opt}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Submit */}
        <Button
          className="w-full sm:w-auto"
          size="lg"
          disabled={!allAnswered || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingId ? "Atualizar Diagnóstico" : "Calcular Score"}
        </Button>

        {/* Result */}
        {showResult && allAnswered && (
          <Card className={`border-l-4 ${si.bg.replace("bg-", "border-l-")}`}>
            <CardContent className="p-6 text-center space-y-3">
              {/* Score circle */}
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-current" style={{ borderColor: `var(--${si.text.replace("text-", "")})` }}>
                <div>
                  <p className={`text-4xl font-extrabold ${si.text}`}>{score}</p>
                  <p className="text-[10px] text-muted-foreground">/100</p>
                </div>
              </div>
              {scoreDiff !== null && (
                <div className="flex items-center justify-center gap-1 text-sm">
                  {scoreDiff > 0 ? <ArrowUp className="h-4 w-4 text-success" /> : scoreDiff < 0 ? <ArrowDown className="h-4 w-4 text-destructive" /> : null}
                  <span className={scoreDiff > 0 ? "text-success" : scoreDiff < 0 ? "text-destructive" : ""}>
                    vs mês anterior: {scoreDiff > 0 ? "+" : ""}{scoreDiff} pontos
                  </span>
                </div>
              )}
              <p className="text-lg font-bold">{si.label}</p>
              <p className="text-sm text-muted-foreground">{si.desc}</p>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.map((h) => {
                const sc = h.total_score ?? 0;
                const c = sc >= 85 ? "bg-success" : sc >= 70 ? "bg-warning" : "bg-destructive";
                return (
                  <div key={h.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm font-medium">{monthLabel(h.month_year)}</span>
                    <Badge className={`${c} text-white`}>{sc} pts</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
