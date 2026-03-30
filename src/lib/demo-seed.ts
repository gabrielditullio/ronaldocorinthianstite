import { supabase } from "@/integrations/supabase/client";

// ─── Helpers ────────────────────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.round(rand(min, max));

function getWorkingDays(year: number, month: number): number[] {
  const days: number[] = [];
  const dim = new Date(year, month, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) days.push(d);
  }
  return days;
}

function distributeTotal(total: number, n: number): number[] {
  if (n === 0) return [];
  const raw = Array.from({ length: n }, () => rand(0.6, 1.4));
  const rawSum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map(v => Math.max(0, Math.round((v / rawSum) * total)));
  const diff = total - scaled.reduce((a, b) => a + b, 0);
  scaled[scaled.length - 1] = Math.max(0, scaled[scaled.length - 1] + diff);
  return scaled;
}

function distributeSales(totalSales: number, dailyMeetings: number[]): number[] {
  const sales = new Array(dailyMeetings.length).fill(0);
  const pool: number[] = [];
  dailyMeetings.forEach((m, i) => { for (let j = 0; j < m; j++) pool.push(i); });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let remaining = totalSales;
  for (const dayIdx of pool) {
    if (remaining <= 0) break;
    if (sales[dayIdx] < dailyMeetings[dayIdx]) {
      sales[dayIdx]++;
      remaining--;
    }
  }
  return sales;
}

async function ensureSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error("Sessão expirada. Faça login novamente e tente outra vez.");
  }
  return data.session;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function batchInsert(table: string, rows: any[], batchSize = 250) {
  const maxRetries = 4;
  for (let i = 0; i < rows.length; i += batchSize) {
    if (i > 0 && i % 1000 === 0) await ensureSession();
    const chunk = rows.slice(i, i + batchSize);
    let attempt = 0;
    while (true) {
      const { error } = await (supabase as any).from(table).insert(chunk);
      if (!error) break;
      const msg = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
      const isRateLimitError = msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests");
      if (!isRateLimitError || attempt >= maxRetries) throw error;
      attempt += 1;
      await sleep(500 * attempt);
    }
    if (i + batchSize < rows.length) await sleep(700);
  }
}

// ─── Names ──────────────────────────────────────────────────────────────────
const CLOSER_NAMES = [
  "Isídio Carvalho", "Gustavo Mendes", "Leonardo Ribeiro",
  "Camila Ferreira", "Rafael Oliveira", "Juliana Santos",
];
const SDR_NAMES = [
  "Thiago Almeida", "Bruna Costa", "Felipe Nascimento",
  "Amanda Rocha", "Diego Martins", "Larissa Pereira",
];

const BRAZILIAN_FIRST = ["Lucas","Pedro","Ana","Maria","João","Carlos","Fernanda","Roberto","Marcos","Tatiana","Sandra","Rodrigo","Patrícia","Eduardo","Daniela","Gabriel","Beatriz","Henrique","Isabela","Vinícius","Luana","André","Renata","Bruno","Priscila","Alexandre","Letícia","Mateus","Natália","Fábio","Cláudia","Leandro","Mariana","Thiago","Carolina","Ricardo","Vanessa","Guilherme","Aline","Marcelo","Júlia","Sérgio","Débora","Otávio","Raquel","Douglas","Cristina","Rogério","Simone","Adriano"];
const BRAZILIAN_LAST = ["Silva","Santos","Oliveira","Souza","Pereira","Lima","Costa","Ferreira","Rodrigues","Almeida","Nascimento","Araújo","Melo","Barbosa","Ribeiro","Carvalho","Mendes","Gomes","Martins","Rocha","Moreira","Cardoso","Teixeira","Vieira","Pinto"];

// ─── Seller Profiles ────────────────────────────────────────────────────────
interface SellerProfile {
  name: string;
  role: "sdr" | "closer";
  startMonth: string;
  avgLeadsPerDay?: number;
  avgMeetingsPerDay?: number;
  closeRate?: number;
}

const SELLER_PROFILES: SellerProfile[] = [
  { name: "Thiago Almeida",   role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 14 },
  { name: "Bruna Costa",      role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 12 },
  { name: "Felipe Nascimento",role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 10 },
  { name: "Amanda Rocha",     role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 9 },
  { name: "Diego Martins",    role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 8 },
  { name: "Larissa Pereira",  role: "sdr", startMonth: "2025-09", avgLeadsPerDay: 7 },
  { name: "Isídio Carvalho",  role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 4, closeRate: 0.35 },
  { name: "Gustavo Mendes",   role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 3.5, closeRate: 0.30 },
  { name: "Leonardo Ribeiro", role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 3, closeRate: 0.25 },
  { name: "Camila Ferreira",  role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 3, closeRate: 0.28 },
  { name: "Rafael Oliveira",  role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 2.5, closeRate: 0.22 },
  { name: "Juliana Santos",   role: "closer", startMonth: "2025-08", avgMeetingsPerDay: 2, closeRate: 0.20 },
];

// ─── Monthly Plan ───────────────────────────────────────────────────────────
interface MonthPlan {
  my: string;
  leads: number;
  qual: number;
  sched: number;
  comp: number;
  sales: number;
  ticket: number;
  collectRate: number;
}

const MONTHLY_PLAN: MonthPlan[] = [
  { my: "2025-03", leads: 300, qual: 150, sched: 105, comp: 74,  sales: 16, ticket: 8800,  collectRate: 0.85 },
  { my: "2025-04", leads: 290, qual: 145, sched: 102, comp: 71,  sales: 16, ticket: 8900,  collectRate: 0.85 },
  { my: "2025-05", leads: 320, qual: 163, sched: 114, comp: 81,  sales: 19, ticket: 9000,  collectRate: 0.86 },
  { my: "2025-06", leads: 340, qual: 170, sched: 121, comp: 86,  sales: 20, ticket: 9100,  collectRate: 0.86 },
  { my: "2025-07", leads: 360, qual: 187, sched: 133, comp: 96,  sales: 23, ticket: 9200,  collectRate: 0.87 },
  { my: "2025-08", leads: 385, qual: 200, sched: 144, comp: 104, sales: 25, ticket: 9400,  collectRate: 0.87 },
  { my: "2025-09", leads: 410, qual: 217, sched: 156, comp: 114, sales: 28, ticket: 9500,  collectRate: 0.88 },
  { my: "2025-10", leads: 450, qual: 239, sched: 175, comp: 128, sales: 32, ticket: 9700,  collectRate: 0.88 },
  { my: "2025-11", leads: 470, qual: 254, sched: 186, comp: 138, sales: 36, ticket: 9900,  collectRate: 0.89 },
  { my: "2025-12", leads: 380, qual: 198, sched: 141, comp: 99,  sales: 24, ticket: 9800,  collectRate: 0.87 },
  { my: "2026-01", leads: 510, qual: 280, sched: 207, comp: 155, sales: 42, ticket: 10200, collectRate: 0.90 },
  { my: "2026-02", leads: 490, qual: 255, sched: 184, comp: 134, sales: 34, ticket: 10000, collectRate: 0.90 },
];

const LEADS_PER_MONTH = [10, 10, 11, 12, 14, 16, 17, 18, 20, 22, 24, 25];

// ─── SEED STEPS ─────────────────────────────────────────────────────────────
export const SEED_STEPS: string[] = [
  "Limpando dados anteriores...",
  "Criando equipe...",
  "Gerando snapshots mensais (12 meses)...",
  "Preenchendo KPIs diários (12 meses, todos vendedores)...",
  "Adicionando métricas de tráfego pago...",
  "Configurando canais de venda + KPIs semanais...",
  "Criando métricas de sessão...",
  "Configurando simulações de meta...",
  "Populando leads e pipeline (200+ leads)...",
  "Gerando transições de estágio...",
  "Populando diagnósticos e CAC...",
];

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────
export async function seedDemoData(
  userId: string,
  onStep: (stepIndex: number) => void
) {
  const session = await ensureSession();
  if (session.user.id !== userId) {
    throw new Error("Sessão não corresponde ao usuário. Faça login novamente.");
  }

  let funnelId: string | null = null;
  const { data: funnels } = await supabase.from("funnels").select("id").eq("user_id", userId).eq("is_active", true).limit(1);
  if (funnels && funnels.length > 0) funnelId = funnels[0].id;

  // ── Step 0: Clean existing data ──
  onStep(0);
  await cleanDemoData(userId);

  // ── Step 1: Team Members ──
  onStep(1);
  const teamRows = SELLER_PROFILES.map(p => ({
    name: p.name, role: p.role, user_id: userId, is_active: true,
    monthly_scheduling_goal: p.role === "sdr" ? randInt(20, 40) : 0,
    monthly_lead_goal: p.role === "sdr" ? Math.round((p.avgLeadsPerDay || 10) * 22) : 25,
    monthly_revenue_goal: p.role === "closer" ? randInt(80000, 150000) : 100000,
  }));
  const { data: teamData, error: teamErr } = await supabase.from("team_members").insert(teamRows).select("id, name, role");
  if (teamErr) throw teamErr;
  const members = teamData!;
  const memberMap = new Map(members.map(m => [m.name, m.id]));
  const closerMembers = members.filter(m => m.role === "closer");
  const sdrMembers = members.filter(m => m.role === "sdr");

  // ── Step 2: Monthly Snapshots ──
  onStep(2);
  const snapRows = MONTHLY_PLAN.map(m => {
    const rev = m.sales * m.ticket;
    const billed = rev;
    const received = Math.round(billed * m.collectRate);
    return {
      user_id: userId, funnel_id: funnelId, month_year: m.my,
      leads_generated: m.leads,
      qualification_rate: Math.round((m.qual / m.leads) * 100),
      meetings_booked: m.sched,
      proposals_sent: m.comp,
      deals_closed: m.sales,
      total_revenue: rev,
      close_rate: Math.round((m.sales / m.comp) * 100),
      avg_ticket: m.ticket,
      total_billed: billed,
      total_received: received,
    };
  });
  const { error: snapErr } = await supabase.from("monthly_snapshots").insert(snapRows);
  if (snapErr) throw snapErr;

  // ── Step 3: Daily Seller KPIs (all 12 months) ──
  await ensureSession();
  onStep(3);
  const kpiRows: any[] = [];

  for (const plan of MONTHLY_PLAN) {
    const [yearStr, monthStr] = plan.my.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const workingDays = getWorkingDays(year, month);
    const numDays = workingDays.length;

    const activeSDRs = SELLER_PROFILES.filter(p => p.role === "sdr" && plan.my >= p.startMonth);
    const activeClosers = SELLER_PROFILES.filter(p => p.role === "closer" && plan.my >= p.startMonth);

    // Pick a random SDR to link to each closer for sdr_team_member_id
    const sdrIds = activeSDRs.map(s => memberMap.get(s.name)!);

    // ── SDR distribution ──
    const sdrWeights = activeSDRs.map(s => s.avgLeadsPerDay!);
    const sdrTotalWeight = sdrWeights.reduce((a, b) => a + b, 0);

    for (let si = 0; si < activeSDRs.length; si++) {
      const sdr = activeSDRs[si];
      const memberId = memberMap.get(sdr.name)!;
      const sdrMonthlyLeads = Math.round(plan.leads * (sdrWeights[si] / sdrTotalWeight));
      const dailyLeads = distributeTotal(sdrMonthlyLeads, numDays);

      const offDays = new Set<number>();
      const numOff = randInt(1, 2);
      while (offDays.size < numOff) offDays.add(randInt(0, numDays - 1));

      for (let di = 0; di < numDays; di++) {
        const day = workingDays[di];
        const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
        const isOff = offDays.has(di);
        const lg = isOff ? 0 : Math.max(0, dailyLeads[di]);
        const lq = Math.round(lg * rand(0.40, 0.58));
        const ms = Math.round(lq * rand(0.50, 0.70));
        kpiRows.push({
          user_id: userId, team_member_id: memberId, date: dateStr,
          funnel_id: funnelId,
          leads_generated: lg, leads_qualified: lq, meetings_scheduled: ms,
          meetings_completed: 0, sales: 0, revenue: 0, net_revenue: 0,
        });
      }
    }

    // ── Closer distribution ──
    const closerWeights = activeClosers.map(c => c.avgMeetingsPerDay!);
    const closerTotalWeight = closerWeights.reduce((a, b) => a + b, 0);

    for (let ci = 0; ci < activeClosers.length; ci++) {
      const closer = activeClosers[ci];
      const memberId = memberMap.get(closer.name)!;
      const closerMonthlyMeetings = Math.round(plan.comp * (closerWeights[ci] / closerTotalWeight));
      const closerMonthlySales = Math.round(plan.sales * (closerWeights[ci] / closerTotalWeight) * (closer.closeRate! / 0.25));
      const clampedSales = Math.min(closerMonthlySales, closerMonthlyMeetings);

      const dailyMeetings = distributeTotal(closerMonthlyMeetings, numDays);
      const dailySales = distributeSales(clampedSales, dailyMeetings);

      const offDays = new Set<number>();
      const numOff = randInt(1, 2);
      while (offDays.size < numOff) offDays.add(randInt(0, numDays - 1));

      // Link to a random SDR
      const linkedSdrId = sdrIds.length > 0 ? sdrIds[ci % sdrIds.length] : null;

      for (let di = 0; di < numDays; di++) {
        const day = workingDays[di];
        const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
        const isOff = offDays.has(di);
        const mc = isOff ? 0 : dailyMeetings[di];
        const s = isOff ? 0 : Math.min(dailySales[di], mc);
        const rev = s * randInt(Math.round(plan.ticket * 0.85), Math.round(plan.ticket * 1.15));
        const netRev = Math.round(rev * rand(0.82, 0.92));
        kpiRows.push({
          user_id: userId, team_member_id: memberId, date: dateStr,
          funnel_id: funnelId,
          sdr_team_member_id: linkedSdrId,
          leads_generated: 0, leads_qualified: 0, meetings_scheduled: 0,
          meetings_completed: mc, sales: s,
          revenue: rev, net_revenue: netRev,
        });
      }
    }
  }

  await batchInsert("daily_seller_kpis", kpiRows);

  // ── Step 4: Ad Metrics (all 12 months) ──
  await ensureSession();
  onStep(4);
  const adRows: any[] = [];
  for (const plan of MONTHLY_PLAN) {
    const [yearStr, monthStr] = plan.my.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const workingDays = getWorkingDays(year, month);
    const monthlyAdLeads = Math.round(plan.leads * 0.70);
    const dailyAdLeads = distributeTotal(monthlyAdLeads, workingDays.length);
    const cpl = rand(35, 55);
    const monthlyInvestment = monthlyAdLeads * cpl;

    for (let di = 0; di < workingDays.length; di++) {
      const day = workingDays[di];
      const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
      const dayLeads = dailyAdLeads[di];
      const dayInvestment = Math.round((monthlyInvestment / workingDays.length) * rand(0.7, 1.3) * 100) / 100;
      const cpm = rand(15, 25);
      const ctr = rand(0.025, 0.035);
      const impressions = Math.round(dayInvestment / cpm * 1000);
      const clicks = Math.round(impressions * ctr);
      const pageViews = Math.round(clicks * rand(0.70, 0.85));
      adRows.push({
        user_id: userId, date: dateStr, funnel_id: funnelId,
        investment: dayInvestment, impressions, clicks,
        page_views: pageViews, leads_from_ads: dayLeads,
      });
    }
  }
  await batchInsert("ad_metrics", adRows);

  // ── Step 5: Sales Channels + Weekly KPIs ──
  onStep(5);
  const channelNames = ["Tráfego Pago", "Social Selling", "Link da Bio", "Indicação", "Outbound"];
  const channelInsert = channelNames.map(name => ({ user_id: userId, name, is_active: true, funnel_id: funnelId }));
  const { data: channelData, error: chErr } = await supabase.from("sales_channels").insert(channelInsert).select("id, name");
  if (chErr) throw chErr;
  const channels = channelData!;

  // Channel monthly data
  const channelPcts: Record<string, { pct: number; targetMult: number }> = {
    "Tráfego Pago":   { pct: 0.40, targetMult: 1.05 },
    "Social Selling":  { pct: 0.20, targetMult: 1.00 },
    "Link da Bio":     { pct: 0.15, targetMult: 1.00 },
    "Indicação":       { pct: 0.15, targetMult: 1.00 },
    "Outbound":        { pct: 0.10, targetMult: 1.10 },
  };

  const chMonthlyRows: any[] = [];
  for (const plan of MONTHLY_PLAN) {
    const [y, m] = plan.my.split("-").map(Number);
    const monthRev = plan.sales * plan.ticket;
    for (const ch of channels) {
      const cfg = channelPcts[ch.name] || { pct: 0.05, targetMult: 1.0 };
      const actual = Math.round(monthRev * cfg.pct * rand(0.85, 1.15));
      const target = Math.round(actual * cfg.targetMult * rand(0.95, 1.10));
      chMonthlyRows.push({
        user_id: userId, channel_id: ch.id, month: m, year: y,
        actual, target, funnel_id: funnelId,
      });
    }
  }
  const { error: cmErr } = await supabase.from("channel_monthly_data").insert(chMonthlyRows);
  if (cmErr) throw cmErr;

  // Channel weekly KPIs (last 3 months)
  const weeklyKpiRows: any[] = [];
  const recentMonths = MONTHLY_PLAN.slice(-3);
  for (const plan of recentMonths) {
    for (const ch of channels) {
      const cfg = channelPcts[ch.name] || { pct: 0.1, targetMult: 1.0 };
      const monthLeads = Math.round(plan.leads * cfg.pct);
      for (let w = 1; w <= 4; w++) {
        const weekLeads = Math.round(monthLeads / 4 * rand(0.7, 1.3));
        const weekQual = Math.round(weekLeads * rand(0.40, 0.55));
        const weekSched = Math.round(weekQual * rand(0.50, 0.70));
        const weekComp = Math.round(weekSched * rand(0.65, 0.85));
        const weekSales = Math.round(weekComp * rand(0.15, 0.35));
        const attRate = weekSched > 0 ? Math.round((weekComp / weekSched) * 100) : 0;
        const convRate = weekComp > 0 ? Math.round((weekSales / weekComp) * 100) : 0;
        weeklyKpiRows.push({
          user_id: userId, channel_id: ch.id, funnel_id: funnelId,
          month_year: plan.my, week_number: w,
          leads_total: weekLeads, leads_total_meta: Math.round(weekLeads * rand(0.9, 1.1)),
          leads_qualified: weekQual, leads_qualified_meta: Math.round(weekQual * rand(0.9, 1.1)),
          calls_scheduled: weekSched, calls_scheduled_meta: Math.round(weekSched * rand(0.9, 1.1)),
          calls_completed: weekComp, calls_completed_meta: Math.round(weekComp * rand(0.9, 1.1)),
          attendance_rate: attRate, attendance_rate_meta: Math.round(attRate * rand(0.95, 1.05)),
          sales: weekSales, sales_meta: Math.round(weekSales * rand(0.9, 1.2)),
          conversion_rate: convRate, conversion_rate_meta: Math.round(convRate * rand(0.95, 1.1)),
        });
      }
    }
  }
  await batchInsert("channel_weekly_kpis", weeklyKpiRows);

  // ── Step 6: Session Metrics (12 months) ──
  await ensureSession();
  onStep(6);
  const sessionRows: any[] = [];
  for (let i = 0; i < MONTHLY_PLAN.length; i++) {
    const plan = MONTHLY_PLAN[i];
    const [y, m] = plan.my.split("-").map(Number);
    const progress = i / (MONTHLY_PLAN.length - 1);
    const lerp = (start: number, end: number) => Math.round((start + (end - start) * progress) * rand(0.95, 1.05));
    sessionRows.push({
      user_id: userId, funnel_id: funnelId,
      session_date: `${plan.my}-${String(randInt(10, 20)).padStart(2, "0")}`,
      month: m, year: y,
      notes: `Revisão de métricas ${plan.my}`,
      action_items: "Itens de ação do mês",
      key_decisions: "Decisões estratégicas",
      form_completion_rate: lerp(68, 78),
      scheduling_rate: lerp(24, 33),
      attendance_rate: lerp(70, 79),
      noshow_confirmed: lerp(15, 9),
      noshow_unconfirmed: lerp(38, 28),
      reschedule_rate: lerp(20, 15),
      recorded_calls_rate: lerp(80, 90),
      confirmation_rate: lerp(74, 84),
      avg_ticket: lerp(9200, 10500),
    });
  }
  const { error: sessErr } = await supabase.from("session_metrics").insert(sessionRows);
  if (sessErr) throw sessErr;

  // ── Step 7: Goal Simulations ──
  await ensureSession();
  onStep(7);
  const sims = [
    { user_id: userId, funnel_id: funnelId, target_revenue: 300000, avg_ticket: 9500, conversion_rate: 25, show_rate: 75, scheduling_rate: 30, qualification_rate: 52, working_days: 22, num_sellers: 6 },
    { user_id: userId, funnel_id: funnelId, target_revenue: 500000, avg_ticket: 10000, conversion_rate: 30, show_rate: 80, scheduling_rate: 35, qualification_rate: 55, working_days: 22, num_sellers: 6 },
  ];
  const { error: simErr } = await supabase.from("goal_simulations").insert(sims);
  if (simErr) throw simErr;

  // ── Step 8: Leads + Pipeline Meetings (200+ leads) ──
  await ensureSession();
  onStep(8);
  const stages = ["lead", "qualification", "meeting", "proposal", "closed_won", "closed_lost"];
  const sources = ["traffic", "inbound", "referral", "outbound", "ss", "bio", "other"];
  const sourceWeights = [0.35, 0.10, 0.15, 0.10, 0.15, 0.10, 0.05];

  const allLeadRows: any[] = [];

  for (let mi = 0; mi < MONTHLY_PLAN.length; mi++) {
    const plan = MONTHLY_PLAN[mi];
    const [yearStr, monthStr] = plan.my.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const numLeads = LEADS_PER_MONTH[mi];
    const monthAge = MONTHLY_PLAN.length - 1 - mi;

    for (let li = 0; li < numLeads; li++) {
      const day = randInt(1, Math.min(28, new Date(year, month, 0).getDate()));
      const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
      const firstName = BRAZILIAN_FIRST[randInt(0, BRAZILIAN_FIRST.length - 1)];
      const lastName = BRAZILIAN_LAST[randInt(0, BRAZILIAN_LAST.length - 1)];

      let stage: string;
      const r = Math.random();
      if (monthAge >= 6) {
        if (r < 0.05) stage = "lead";
        else if (r < 0.10) stage = "qualification";
        else if (r < 0.15) stage = "meeting";
        else if (r < 0.25) stage = "proposal";
        else if (r < 0.70) stage = "closed_won";
        else stage = "closed_lost";
      } else if (monthAge >= 2) {
        if (r < 0.10) stage = "lead";
        else if (r < 0.20) stage = "qualification";
        else if (r < 0.35) stage = "meeting";
        else if (r < 0.50) stage = "proposal";
        else if (r < 0.75) stage = "closed_won";
        else stage = "closed_lost";
      } else {
        if (r < 0.30) stage = "lead";
        else if (r < 0.55) stage = "qualification";
        else if (r < 0.70) stage = "meeting";
        else if (r < 0.80) stage = "proposal";
        else if (r < 0.90) stage = "closed_won";
        else stage = "closed_lost";
      }

      // Source selection
      const sr = Math.random();
      let cumul = 0;
      let source = "other";
      for (let si = 0; si < sources.length; si++) {
        cumul += sourceWeights[si];
        if (sr <= cumul) { source = sources[si]; break; }
      }

      const isEarlyStage = stage === "lead" || stage === "qualification";
      const assignPool = isEarlyStage ? sdrMembers : closerMembers;
      const assignedMember = assignPool[randInt(0, assignPool.length - 1)];

      const leadRow: any = {
        user_id: userId, funnel_id: funnelId,
        name: `${firstName} ${lastName}`,
        stage, lead_source: source,
        assigned_to: assignedMember.id,
        created_at: dateStr, stage_changed_at: dateStr,
        proposal_value: (stage === "proposal" || stage === "closed_won") ? randInt(7000, 15000) : null,
        company: `Empresa ${randInt(100, 999)}`,
      };

      // Add campaign info for traffic leads
      if (source === "traffic") {
        const campaigns = ["LS_Captação_Geral", "Remarketing_Base", "Lookalike_Clientes", "Tráfego_Direto"];
        leadRow.campaign_name = campaigns[randInt(0, campaigns.length - 1)];
      }

      allLeadRows.push(leadRow);
    }
  }

  const { data: leadsData, error: leadErr } = await supabase.from("leads").insert(allLeadRows).select("id, stage, created_at, lead_source");
  if (leadErr) throw leadErr;

  // Pipeline meetings
  const meetingLeads = leadsData!.filter(l => ["meeting", "proposal", "closed_won", "closed_lost"].includes(l.stage));
  if (meetingLeads.length > 0) {
    const meetingRows = meetingLeads.map(lead => {
      const closer = closerMembers[randInt(0, closerMembers.length - 1)];
      const createdDate = new Date(lead.created_at);
      createdDate.setDate(createdDate.getDate() + randInt(2, 7));
      return {
        user_id: userId, funnel_id: funnelId,
        meeting_date: createdDate.toISOString().slice(0, 10),
        facilitator: closer.name,
        wins: lead.stage === "closed_won" ? "Venda realizada" : null,
        notes: `Reunião com lead`,
        week_label: `Sem ${Math.ceil(createdDate.getDate() / 7)}`,
      };
    });
    await batchInsert("pipeline_meetings", meetingRows);
  }

  // ── Step 9: Lead Stage Transitions ──
  onStep(9);
  const stageOrder = ["lead", "qualification", "meeting", "proposal", "closed_won", "closed_lost"];
  const transitionRows: any[] = [];

  for (const lead of leadsData!) {
    const stageIdx = stageOrder.indexOf(lead.stage);
    if (stageIdx < 0) continue;
    const createdAt = new Date(lead.created_at).getTime();
    const passedStages = stageOrder.slice(0, stageIdx + 1);
    const filteredStages = lead.stage === "closed_lost"
      ? passedStages.filter(s => s !== "closed_won")
      : passedStages.filter(s => s !== "closed_lost");

    transitionRows.push({
      user_id: userId, lead_id: lead.id,
      from_stage: null, to_stage: filteredStages[0],
      transitioned_at: new Date(createdAt).toISOString(),
    });

    const delays = [0, randInt(2, 5), randInt(3, 7), randInt(1, 3), randInt(2, 10)];
    let cumMs = createdAt;
    for (let i = 0; i < filteredStages.length - 1; i++) {
      const delayDays = delays[i + 1] || randInt(1, 5);
      cumMs += delayDays * 24 * 60 * 60 * 1000;
      transitionRows.push({
        user_id: userId, lead_id: lead.id,
        from_stage: filteredStages[i],
        to_stage: filteredStages[i + 1],
        transitioned_at: new Date(cumMs).toISOString(),
      });
    }
  }

  await batchInsert("lead_stage_transitions", transitionRows);

  // ── Step 10: Diagnostics + CAC ──
  await ensureSession();
  onStep(10);

  const diagRows: any[] = [];
  const cacRows: any[] = [];
  for (let i = 0; i < MONTHLY_PLAN.length; i++) {
    const plan = MONTHLY_PLAN[i];
    const progress = i / (MONTHLY_PLAN.length - 1);
    const lerp = (start: number, end: number) => Math.round((start + (end - start) * progress) * rand(0.92, 1.08));

    diagRows.push({
      user_id: userId, month_year: plan.my,
      q1_leads_per_week: lerp(40, 90),
      q2_lead_to_meeting: lerp(18, 32),
      q3_meeting_to_proposal: lerp(55, 72),
      q4_proposal_to_close: lerp(18, 28),
      q5_team_knows_goals: lerp(2, 5),
      q6_weekly_data_review: lerp(2, 5),
      q7_sdr_closer_sla: lerp(2, 5),
      total_score: lerp(35, 72),
    });

    const rev = plan.sales * plan.ticket;
    const mktInvestment = Math.round(rev * rand(0.08, 0.15));
    const salesInvestment = Math.round(rev * rand(0.05, 0.10));
    const toolsInvestment = randInt(2000, 5000);
    const totalInvestment = mktInvestment + salesInvestment + toolsInvestment;
    const cac = plan.sales > 0 ? Math.round(totalInvestment / plan.sales) : 0;

    cacRows.push({
      user_id: userId, month_year: plan.my,
      marketing_investment: mktInvestment,
      sales_investment: salesInvestment,
      tools_investment: toolsInvestment,
      total_investment: totalInvestment,
      new_clients: plan.sales,
      cac,
      avg_ticket: plan.ticket,
      payback_months: plan.ticket > 0 ? Math.round((cac / plan.ticket) * 10) / 10 : 0,
    });
  }

  await batchInsert("diagnostics", diagRows);
  await batchInsert("cac_calculations", cacRows);
}

// ─── CLEAN FUNCTION ─────────────────────────────────────────────────────────
export async function cleanDemoData(userId: string) {
  const tables = [
    "channel_weekly_kpis", "daily_seller_kpis", "ad_metrics", "channel_monthly_data",
    "sales_channels", "goal_simulations", "session_metrics", "lead_stage_transitions",
    "pipeline_meetings", "leads", "monthly_snapshots", "team_members",
    "diagnostics", "cac_calculations",
  ];
  for (const table of tables) {
    const { error } = await (supabase.from(table as any) as any).delete().eq("user_id", userId);
    if (error) console.warn(`Failed to clean ${table}:`, error.message);
  }
}

// ─── Re-exports ─────────────────────────────────────────────────────────────
export const DEMO_CLOSER_NAMES = CLOSER_NAMES;
export const DEMO_SDR_NAMES = SDR_NAMES;

export type SeedStep = { label: string; done: boolean; };
