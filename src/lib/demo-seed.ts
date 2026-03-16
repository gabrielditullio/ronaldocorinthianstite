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

/** Distribute `total` into `n` buckets with natural variance, summing exactly to total */
function distributeTotal(total: number, n: number): number[] {
  if (n === 0) return [];
  const raw = Array.from({ length: n }, () => rand(0.6, 1.4));
  const rawSum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map(v => Math.max(0, Math.round((v / rawSum) * total)));
  const diff = total - scaled.reduce((a, b) => a + b, 0);
  scaled[scaled.length - 1] = Math.max(0, scaled[scaled.length - 1] + diff);
  return scaled;
}

/** Place `totalSales` sales across days, ensuring sales[i] <= meetings[i] */
function distributeSales(totalSales: number, dailyMeetings: number[]): number[] {
  const sales = new Array(dailyMeetings.length).fill(0);
  const pool: number[] = [];
  dailyMeetings.forEach((m, i) => { for (let j = 0; j < m; j++) pool.push(i); });
  // Shuffle pool
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

/** Ensure session is still alive before heavy operations */
async function ensureSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error("Sessão expirada. Faça login novamente e tente outra vez.");
  }
  return data.session;
}

async function batchInsert(table: string, rows: any[], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    // Refresh session before each batch to prevent token expiry
    if (i > 0 && i % 1500 === 0) {
      await supabase.auth.refreshSession();
      await new Promise(r => setTimeout(r, 500));
    }
    const { error } = await (supabase as any).from(table).insert(rows.slice(i, i + batchSize));
    if (error) throw error;
    // Delay to avoid rate limiting (429)
    if (i + batchSize < rows.length) {
      await new Promise(r => setTimeout(r, 400));
    }
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
  startMonth: string; // YYYY-MM, active from this month onward
  // SDR fields
  avgLeadsPerDay?: number;
  // Closer fields
  avgMeetingsPerDay?: number;
  closeRate?: number;
}

const SELLER_PROFILES: SellerProfile[] = [
  // SDRs
  { name: "Thiago Almeida",   role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 14 },
  { name: "Bruna Costa",      role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 12 },
  { name: "Felipe Nascimento",role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 10 },
  { name: "Amanda Rocha",     role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 9 },
  { name: "Diego Martins",    role: "sdr", startMonth: "2025-03", avgLeadsPerDay: 8 },
  { name: "Larissa Pereira",  role: "sdr", startMonth: "2025-09", avgLeadsPerDay: 7 }, // joined later
  // Closers
  { name: "Isídio Carvalho",  role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 4, closeRate: 0.35 },
  { name: "Gustavo Mendes",   role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 3.5, closeRate: 0.30 },
  { name: "Leonardo Ribeiro", role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 3, closeRate: 0.25 },
  { name: "Camila Ferreira",  role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 3, closeRate: 0.28 },
  { name: "Rafael Oliveira",  role: "closer", startMonth: "2025-03", avgMeetingsPerDay: 2.5, closeRate: 0.22 },
  { name: "Juliana Santos",   role: "closer", startMonth: "2025-08", avgMeetingsPerDay: 2, closeRate: 0.20 }, // joined later
];

// ─── Monthly Plan (12 months, Mar 2025 – Feb 2026) ──────────────────────────
// All derived values are pre-calculated to guarantee mathematical consistency.
// close_rate = sales / comp, qual_rate = qual / leads, etc.
interface MonthPlan {
  my: string;
  leads: number;
  qual: number;
  sched: number;
  comp: number;
  sales: number;
  ticket: number;
  collectRate: number;
  leadsPerMonth?: number; // for lead entity generation
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

// Lead entities per month (total ~210)
const LEADS_PER_MONTH = [10, 10, 11, 12, 14, 16, 17, 18, 20, 22, 24, 25];

// ─── SEED STEPS ─────────────────────────────────────────────────────────────
export const SEED_STEPS: string[] = [
  "Limpando dados anteriores...",
  "Criando equipe...",
  "Gerando snapshots mensais (12 meses)...",
  "Preenchendo KPIs diários (12 meses, todos vendedores)...",
  "Adicionando métricas de tráfego pago...",
  "Configurando canais de venda...",
  "Criando métricas de sessão...",
  "Configurando simulações de meta...",
  "Populando leads e pipeline (200+ leads)...",
  "Gerando transições de estágio...",
];

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────
export async function seedDemoData(
  userId: string,
  onStep: (stepIndex: number) => void
) {
  // Try to find user's default funnel
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
  }));
  const { data: teamData, error: teamErr } = await supabase.from("team_members").insert(teamRows).select("id, name, role");
  if (teamErr) throw teamErr;
  const members = teamData!;
  // Map name → id for lookup
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
      user_id: userId,
      funnel_id: funnelId,
      month_year: m.my,
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

    // Active sellers for this month
    const activeSDRs = SELLER_PROFILES.filter(p => p.role === "sdr" && plan.my >= p.startMonth);
    const activeClosers = SELLER_PROFILES.filter(p => p.role === "closer" && plan.my >= p.startMonth);

    // ── SDR distribution ──
    // Distribute total monthly leads across active SDRs proportionally to skill
    const sdrWeights = activeSDRs.map(s => s.avgLeadsPerDay!);
    const sdrTotalWeight = sdrWeights.reduce((a, b) => a + b, 0);

    for (let si = 0; si < activeSDRs.length; si++) {
      const sdr = activeSDRs[si];
      const memberId = memberMap.get(sdr.name)!;
      const sdrMonthlyLeads = Math.round(plan.leads * (sdrWeights[si] / sdrTotalWeight));

      // Distribute leads across working days
      const dailyLeads = distributeTotal(sdrMonthlyLeads, numDays);

      // Apply 1-2 off days per month
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
          meetings_completed: 0, sales: 0, revenue: 0,
        });
      }
    }

    // ── Closer distribution ──
    // Distribute total monthly completed meetings and sales across closers
    const closerWeights = activeClosers.map(c => c.avgMeetingsPerDay!);
    const closerTotalWeight = closerWeights.reduce((a, b) => a + b, 0);

    for (let ci = 0; ci < activeClosers.length; ci++) {
      const closer = activeClosers[ci];
      const memberId = memberMap.get(closer.name)!;
      const closerMonthlyMeetings = Math.round(plan.comp * (closerWeights[ci] / closerTotalWeight));
      const closerMonthlySales = Math.round(plan.sales * (closerWeights[ci] / closerTotalWeight) * (closer.closeRate! / 0.25));
      // Clamp sales to not exceed meetings
      const clampedSales = Math.min(closerMonthlySales, closerMonthlyMeetings);

      const dailyMeetings = distributeTotal(closerMonthlyMeetings, numDays);
      const dailySales = distributeSales(clampedSales, dailyMeetings);

      // Off days
      const offDays = new Set<number>();
      const numOff = randInt(1, 2);
      while (offDays.size < numOff) offDays.add(randInt(0, numDays - 1));

      for (let di = 0; di < numDays; di++) {
        const day = workingDays[di];
        const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
        const isOff = offDays.has(di);
        const mc = isOff ? 0 : dailyMeetings[di];
        const s = isOff ? 0 : Math.min(dailySales[di], mc);
        kpiRows.push({
          user_id: userId, team_member_id: memberId, date: dateStr,
          funnel_id: funnelId,
          leads_generated: 0, leads_qualified: 0, meetings_scheduled: 0,
          meetings_completed: mc, sales: s,
          revenue: s * randInt(Math.round(plan.ticket * 0.85), Math.round(plan.ticket * 1.15)),
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

    // ~70% of leads come from ads
    const monthlyAdLeads = Math.round(plan.leads * 0.70);
    const dailyAdLeads = distributeTotal(monthlyAdLeads, workingDays.length);

    // Backward-calculate investment from leads × CPL
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

  // ── Step 5: Sales Channels + Monthly Data ──
  onStep(5);
  const channelNames = ["Tráfego Pago", "Indicação", "Outbound", "Orgânico", "Eventos"];
  const channelInsert = channelNames.map(name => ({ user_id: userId, name, is_active: true, funnel_id: funnelId }));
  const { data: channelData, error: chErr } = await supabase.from("sales_channels").insert(channelInsert).select("id, name");
  if (chErr) throw chErr;
  const channels = channelData!;

  const channelPcts: Record<string, { pct: number; targetMult: number }> = {
    "Tráfego Pago": { pct: 0.45, targetMult: 1.05 },
    "Indicação":    { pct: 0.25, targetMult: 1.00 },
    "Outbound":     { pct: 0.15, targetMult: 1.10 },
    "Orgânico":     { pct: 0.10, targetMult: 1.00 },
    "Eventos":      { pct: 0.05, targetMult: 1.00 },
  };

  const chMonthlyRows: any[] = [];
  for (const plan of MONTHLY_PLAN) {
    const [y, m] = plan.my.split("-").map(Number);
    const monthRev = plan.sales * plan.ticket;
    for (const ch of channels) {
      const cfg = channelPcts[ch.name] || { pct: 0.05, targetMult: 1.0 };
      // Events are sporadic
      let pct = cfg.pct;
      if (ch.name === "Eventos" && Math.random() < 0.3) pct = 0;
      const actual = Math.round(monthRev * pct * rand(0.85, 1.15));
      const target = Math.round(actual * cfg.targetMult * rand(0.95, 1.10));
      chMonthlyRows.push({
        user_id: userId, channel_id: ch.id, month: m, year: y,
        actual, target, funnel_id: funnelId,
      });
    }
  }
  const { error: cmErr } = await supabase.from("channel_monthly_data").insert(chMonthlyRows);
  if (cmErr) throw cmErr;

  // ── Step 6: Session Metrics (12 months) ──
  onStep(6);
  const sessionRows: any[] = [];
  for (let i = 0; i < MONTHLY_PLAN.length; i++) {
    const plan = MONTHLY_PLAN[i];
    const [y, m] = plan.my.split("-").map(Number);
    const progress = i / (MONTHLY_PLAN.length - 1); // 0 → 1 over 12 months
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
  onStep(7);
  const sims = [
    { user_id: userId, funnel_id: funnelId, target_revenue: 300000, avg_ticket: 9500, conversion_rate: 25, show_rate: 75, scheduling_rate: 30, qualification_rate: 52, working_days: 22, num_sellers: 6 },
    { user_id: userId, funnel_id: funnelId, target_revenue: 500000, avg_ticket: 10000, conversion_rate: 30, show_rate: 80, scheduling_rate: 35, qualification_rate: 55, working_days: 22, num_sellers: 6 },
  ];
  const { error: simErr } = await supabase.from("goal_simulations").insert(sims);
  if (simErr) throw simErr;

  // ── Step 8: Leads + Pipeline Meetings (200+ leads) ──
  onStep(8);
  const stages = ["lead", "qualification", "meeting", "proposal", "closed_won", "closed_lost"];
  const sources = ["traffic", "inbound", "referral", "outbound", "other"];
  const sourceWeights = [0.45, 0.10, 0.25, 0.15, 0.05];

  const allLeadRows: any[] = [];
  const allMeetingRows: any[] = [];

  for (let mi = 0; mi < MONTHLY_PLAN.length; mi++) {
    const plan = MONTHLY_PLAN[mi];
    const [yearStr, monthStr] = plan.my.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const numLeads = LEADS_PER_MONTH[mi];
    const monthAge = MONTHLY_PLAN.length - 1 - mi; // 11 = oldest, 0 = newest

    for (let li = 0; li < numLeads; li++) {
      const day = randInt(1, Math.min(28, new Date(year, month, 0).getDate()));
      const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
      const firstName = BRAZILIAN_FIRST[randInt(0, BRAZILIAN_FIRST.length - 1)];
      const lastName = BRAZILIAN_LAST[randInt(0, BRAZILIAN_LAST.length - 1)];

      // Older leads are more likely to be in later stages
      let stage: string;
      const r = Math.random();
      if (monthAge >= 6) {
        // Old leads: mostly closed
        if (r < 0.05) stage = "lead";
        else if (r < 0.10) stage = "qualification";
        else if (r < 0.15) stage = "meeting";
        else if (r < 0.25) stage = "proposal";
        else if (r < 0.70) stage = "closed_won";
        else stage = "closed_lost";
      } else if (monthAge >= 2) {
        // Mid-age leads: mixed
        if (r < 0.10) stage = "lead";
        else if (r < 0.20) stage = "qualification";
        else if (r < 0.35) stage = "meeting";
        else if (r < 0.50) stage = "proposal";
        else if (r < 0.75) stage = "closed_won";
        else stage = "closed_lost";
      } else {
        // Recent leads: mostly early stages
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

      // Assignment: early stages → SDRs, later stages → closers
      const isEarlyStage = stage === "lead" || stage === "qualification";
      const assignPool = isEarlyStage ? sdrMembers : closerMembers;
      const assignedMember = assignPool[randInt(0, assignPool.length - 1)];

      allLeadRows.push({
        user_id: userId, funnel_id: funnelId,
        name: `${firstName} ${lastName}`,
        stage,
        lead_source: source,
        assigned_to: assignedMember.id,
        created_at: dateStr,
        stage_changed_at: dateStr,
        proposal_value: (stage === "proposal" || stage === "closed_won") ? randInt(7000, 15000) : null,
        company: `Empresa ${randInt(100, 999)}`,
      });
    }
  }

  const { data: leadsData, error: leadErr } = await supabase.from("leads").insert(allLeadRows).select("id, stage, created_at, lead_source");
  if (leadErr) throw leadErr;

  // Pipeline meetings for leads in meeting+ stages
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

    // Build path: lead → ... → current stage
    const passedStages = stageOrder.slice(0, stageIdx + 1);
    const filteredStages = lead.stage === "closed_lost"
      ? passedStages.filter(s => s !== "closed_won")
      : passedStages.filter(s => s !== "closed_lost");

    // Transition null → first stage
    transitionRows.push({
      user_id: userId, lead_id: lead.id,
      from_stage: null, to_stage: filteredStages[0],
      transitioned_at: new Date(createdAt).toISOString(),
    });

    // Subsequent transitions with realistic delays
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
}

// ─── CLEAN FUNCTION ─────────────────────────────────────────────────────────
export async function cleanDemoData(userId: string) {
  const tables = [
    "daily_seller_kpis", "ad_metrics", "channel_monthly_data", "sales_channels",
    "goal_simulations", "session_metrics", "lead_stage_transitions", "pipeline_meetings",
    "leads", "monthly_snapshots", "team_members",
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
