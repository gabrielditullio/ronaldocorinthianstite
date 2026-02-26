export type LevelKey = "pessimo" | "ruim" | "bom" | "otimo" | "excelente";

export interface BenchmarkLevel {
  key: LevelKey;
  label: string;
  min?: number;
  max?: number;
  color: string;
  coaching: string;
}

export interface BenchmarkMetric {
  key: string;
  label: string;
  suffix: string;
  inverted?: boolean; // lower is better
  levels: BenchmarkLevel[];
}

export type GuideKey = "high_ticket" | "diagnostic";

// ────────────────────────────────────────────────
// GUIDE 1 — HIGH TICKET DIRETO
// ────────────────────────────────────────────────
const highTicketMetrics: BenchmarkMetric[] = [
  {
    key: "conversion_lead_sale",
    label: "Conversão Lead → Venda",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 1, color: "red", coaching: "Você tá queimando energia e dinheiro. Se cada 100 leads viram menos de 1 cliente, seu funil tá pedindo socorro. Revise geração de leads e qualificação antes de colocar mais gente ou mais tráfego." },
      { key: "ruim", label: "Ruim", min: 1, max: 2, color: "orange", coaching: "Tá na corda bamba. Consegue captar, mas não transforma em contrato. Existe um buraco no meio do funil. Melhore a passagem de bastão entre marketing e comercial." },
      { key: "bom", label: "Bom", min: 2, max: 3, color: "blue", coaching: "Tá na média do mercado, mas quem joga na média nunca vai escalar em HT. Aperte a régua de qualificação e invista em treinamento de fechamento." },
      { key: "otimo", label: "Ótimo", min: 3, max: 4, color: "emerald", coaching: "Seu funil tá saudável, parabéns. O próximo passo é ganhar velocidade sem perder qualidade." },
      { key: "excelente", label: "Excelente", min: 4, color: "green", coaching: "Você tem uma máquina de vendas. Seu desafio agora é manter consistência e estruturar o crescimento." },
    ],
  },
  {
    key: "scheduling_rate",
    label: "Taxa de Agendamento",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 10, color: "red", coaching: "Seu comercial não existe. O CTA não tá claro ou o lead não vê valor na conversa. Precisa reposicionar a oferta de agenda." },
      { key: "ruim", label: "Ruim", min: 10, max: 20, color: "orange", coaching: "Você pede reunião, mas não cria urgência. Refaça a copy de convite, ajuste o funil e mostre por que a call é indispensável." },
      { key: "bom", label: "Bom", min: 20, max: 30, color: "blue", coaching: "Tá no caminho, mas dá pra dobrar esse número. Use gatilhos de escassez e acelere follow-ups." },
      { key: "otimo", label: "Ótimo", min: 30, max: 40, color: "emerald", coaching: "Mensagem clara, processo de captura bem feito. Seu time já consegue manter a agenda cheia." },
      { key: "excelente", label: "Excelente", min: 40, color: "green", coaching: "Top 1% do mercado. Sua agenda é disputada — mantenha a cadência e comece a ser mais seletiva com quem entra." },
    ],
  },
  {
    key: "show_rate",
    label: "Show Rate",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 40, color: "red", coaching: "Seu time tá virando babá de lead que não aparece. Sem confirmação e sem aquecimento, não existe previsibilidade." },
      { key: "ruim", label: "Ruim", min: 40, max: 60, color: "orange", coaching: "Você confirma, mas não cria conexão. Inclua lembretes, aquecimento pré-call e gere compromisso real." },
      { key: "bom", label: "Bom", min: 60, max: 75, color: "blue", coaching: "Tá melhor, mas ainda perde muita energia. Melhore seu processo de pré-venda e alinhe expectativas." },
      { key: "otimo", label: "Ótimo", min: 75, max: 85, color: "emerald", coaching: "Seu time consegue que a maioria apareça. Continue reforçando autoridade e proximidade." },
      { key: "excelente", label: "Excelente", min: 85, color: "green", coaching: "Invejável. Seus leads não querem perder a oportunidade, já chegam prontos." },
    ],
  },
  {
    key: "close_rate",
    label: "Close Rate",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 10, color: "red", coaching: "Seus vendedores tão batendo papo, não vendendo. Invista pesado em metodologia de vendas consultivas e treino de objeções." },
      { key: "ruim", label: "Ruim", min: 10, max: 20, color: "orange", coaching: "Você até apresenta, mas não conduz à decisão. Revise script, faça roleplay e treine fechamento." },
      { key: "bom", label: "Bom", min: 20, max: 30, color: "blue", coaching: "Na média. Com ajuste fino no processo e mais controle de objeções, você escala." },
      { key: "otimo", label: "Ótimo", min: 30, max: 40, color: "emerald", coaching: "Time bem alinhado, bom pitch e autoridade forte. Continue nutrindo e revisando objeções." },
      { key: "excelente", label: "Excelente", min: 40, color: "green", coaching: "Padrão ELITE. Seu time não só fecha, mas gera desejo. Agora é sobre consistência." },
    ],
  },
  {
    key: "goal_achievement",
    label: "Meta Alcançada",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 30, color: "red", coaching: "Sua meta virou enfeite. Revise estratégia e operação urgentemente, porque algo estrutural tá errado." },
      { key: "ruim", label: "Ruim", min: 30, max: 60, color: "orange", coaching: "Time corre, mas não chega. Ou a meta tá mal desenhada, ou sua operação não entrega o que promete." },
      { key: "bom", label: "Bom", min: 60, max: 90, color: "blue", coaching: "Você até cumpre parte, mas sempre no limite. Talvez seja hora de ajustar metas ou melhorar eficiência comercial." },
      { key: "otimo", label: "Ótimo", min: 90, max: 100, color: "emerald", coaching: "Meta pé no chão, execução boa. Agora é ajustar detalhes pra bater com folga." },
      { key: "excelente", label: "Excelente", min: 100, color: "green", coaching: "Aqui não é sobre bater meta, é sobre superar. Você tá liderando o jogo." },
    ],
  },
  {
    key: "cash_collection",
    label: "Cash Collection",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 50, color: "red", coaching: "Você vende, mas não recebe. Isso não é venda, é doação. Urgente revisar cobrança e política de pagamentos." },
      { key: "ruim", label: "Ruim", min: 50, max: 70, color: "orange", coaching: "Dinheiro tá ficando na rua. Crie rotina de cobrança ativa, acompanhe inadimplência e ajuste forma de pagamento." },
      { key: "bom", label: "Bom", min: 70, max: 85, color: "blue", coaching: "Ok, mas ainda perde receita. Estruture cobrança e melhore a análise de crédito do cliente." },
      { key: "otimo", label: "Ótimo", min: 85, max: 95, color: "emerald", coaching: "Fluxo de caixa saudável. Continue reforçando políticas de cobrança e recompensas pra quem paga em dia." },
      { key: "excelente", label: "Excelente", min: 95, color: "green", coaching: "Você recebe quase tudo o que fatura. Isso é ouro em HT: previsibilidade e segurança." },
    ],
  },
  {
    key: "cac_commercial",
    label: "CAC Comercial",
    suffix: "%",
    inverted: true,
    levels: [
      { key: "excelente", label: "Excelente", max: 6, color: "green", coaching: "Você domina aquisição com o comercial. Margem gigante e espaço pra crescer aumentando o time." },
      { key: "otimo", label: "Ótimo", min: 6, max: 10, color: "emerald", coaching: "CAC saudável. Sua operação é sustentável e deixa margem boa." },
      { key: "bom", label: "Bom", min: 10, max: 12, color: "blue", coaching: "Não tá horrível, mas já acendeu a luz amarela. Revise as metas ou ajuste a remuneração pra ficar abaixo dos 10%." },
      { key: "ruim", label: "Ruim", min: 12, max: 18, color: "orange", coaching: "Seu comercial tá caro demais pro que entrega. Olhe para os resultados, metas e remuneração." },
      { key: "pessimo", label: "Péssimo", min: 18, color: "red", coaching: "Alerta vermelho! Você tá gastando mais do que deveria pra vender. Hora de reestruturar a área comercial." },
    ],
  },
];

// ────────────────────────────────────────────────
// GUIDE 2 — FUNIL DIAGNÓSTICO
// ────────────────────────────────────────────────
const diagnosticMetrics: BenchmarkMetric[] = [
  // conversion_lead_sale — same as Guide 1
  { ...highTicketMetrics[0] },
  {
    key: "scheduling_rate",
    label: "Taxa de Agendamento",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 5, color: "red", coaching: "Seu funil diagnóstico não agenda ninguém. O lead não entende o valor da sessão. Reposicione a oferta e melhore a comunicação." },
      { key: "ruim", label: "Ruim", min: 5, max: 10, color: "orange", coaching: "Poucos leads agendam o diagnóstico. Revise a proposta de valor da sessão e crie mais urgência no convite." },
      { key: "bom", label: "Bom", min: 10, max: 20, color: "blue", coaching: "Razoável, mas tem espaço. Use provas sociais e depoimentos pra aumentar a percepção de valor do diagnóstico." },
      { key: "otimo", label: "Ótimo", min: 20, max: 30, color: "emerald", coaching: "Boa taxa pra diagnóstico. Seu lead entende o valor. Continue otimizando a jornada." },
      { key: "excelente", label: "Excelente", min: 30, color: "green", coaching: "Referência em funil diagnóstico. Leads disputam sua agenda de sessões." },
    ],
  },
  {
    key: "show_rate",
    label: "Show Rate",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 50, color: "red", coaching: "Metade não aparece no diagnóstico. Seu processo de confirmação e aquecimento precisa ser recriado do zero." },
      { key: "ruim", label: "Ruim", min: 50, max: 65, color: "orange", coaching: "Ainda perde muitos no-shows. Intensifique lembretes e gere mais compromisso antes da sessão." },
      { key: "bom", label: "Bom", min: 65, max: 80, color: "blue", coaching: "Aceitável, mas cada no-show é receita perdida. Melhore o aquecimento pré-diagnóstico." },
      { key: "otimo", label: "Ótimo", min: 80, max: 90, color: "emerald", coaching: "Ótimo comparecimento. Seus leads valorizam a sessão e chegam preparados." },
      { key: "excelente", label: "Excelente", min: 90, color: "green", coaching: "Quase todo mundo aparece. Seu processo de pré-venda é exemplar." },
    ],
  },
  {
    key: "close_rate",
    label: "Close Rate",
    suffix: "%",
    levels: [
      { key: "pessimo", label: "Péssimo", max: 15, color: "red", coaching: "O diagnóstico não tá gerando desejo de compra. Revise a estrutura da sessão e o pitch de transição." },
      { key: "ruim", label: "Ruim", min: 15, max: 25, color: "orange", coaching: "Você diagnostica, mas não converte. Treine a transição do diagnóstico pro fechamento." },
      { key: "bom", label: "Bom", min: 25, max: 35, color: "blue", coaching: "Na média do mercado diagnóstico. Com melhorias na condução da sessão, sobe bastante." },
      { key: "otimo", label: "Ótimo", min: 35, max: 50, color: "emerald", coaching: "Excelente pra diagnóstico. Seu time conduz bem a sessão e gera urgência." },
      { key: "excelente", label: "Excelente", min: 50, color: "green", coaching: "Referência absoluta. Seu diagnóstico vira venda naturalmente." },
    ],
  },
  // goal_achievement — same as Guide 1
  { ...highTicketMetrics[4] },
  // cash_collection — same as Guide 1
  { ...highTicketMetrics[5] },
  {
    key: "cac_commercial",
    label: "CAC Comercial",
    suffix: "%",
    inverted: true,
    levels: [
      { key: "excelente", label: "Excelente", max: 10, color: "green", coaching: "Custo de aquisição excelente no funil diagnóstico. Margem saudável e espaço pra escalar." },
      { key: "otimo", label: "Ótimo", min: 10, max: 12, color: "emerald", coaching: "CAC controlado. Operação diagnóstica sustentável com boa margem." },
      { key: "bom", label: "Bom", min: 12, max: 15, color: "blue", coaching: "Atenção. Custo subindo — revise remuneração e produtividade do time." },
      { key: "ruim", label: "Ruim", min: 15, max: 20, color: "orange", coaching: "CAC diagnóstico alto. Analise se o volume de sessões justifica o custo operacional." },
      { key: "pessimo", label: "Péssimo", min: 20, color: "red", coaching: "CAC insustentável. Reestruture o modelo diagnóstico ou reduza custos operacionais." },
    ],
  },
];

export const GUIDES: Record<GuideKey, { label: string; metrics: BenchmarkMetric[] }> = {
  high_ticket: { label: "High Ticket Direto", metrics: highTicketMetrics },
  diagnostic: { label: "Funil Diagnóstico", metrics: diagnosticMetrics },
};

export function classifyValue(metric: BenchmarkMetric, value: number): BenchmarkLevel {
  for (const level of metric.levels) {
    const aboveMin = level.min === undefined || value >= level.min;
    const belowMax = level.max === undefined || value < level.max;
    if (aboveMin && belowMax) return level;
  }
  return metric.levels[metric.levels.length - 1];
}

export function scoreToPercent(scores: number[]): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return ((avg - 1) / 4) * 100;
}

export function levelToScore(key: LevelKey): number {
  const map: Record<LevelKey, number> = { pessimo: 1, ruim: 2, bom: 3, otimo: 4, excelente: 5 };
  return map[key];
}
