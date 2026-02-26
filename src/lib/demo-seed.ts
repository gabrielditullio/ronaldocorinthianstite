import { supabase } from "@/integrations/supabase/client";

// Helpers
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.round(rand(min, max));
const jitter = (val: number, pct: number) => Math.round(val * rand(1 - pct, 1 + pct));

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

const WORKING_DAYS_FEB_2026 = [3,4,5,6,7,10,11,12,13,14,17,18,19,20,21,24,25,26];

function getWorkingDays(year: number, month: number): number[] {
  const days: number[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) days.push(d);
  }
  return days;
}

export type SeedStep = {
  label: string;
  done: boolean;
};

export const SEED_STEPS: string[] = [
  "Criando equipe...",
  "Gerando snapshots mensais...",
  "Preenchendo KPIs diários...",
  "Adicionando métricas de tráfego...",
  "Configurando canais de venda...",
  "Criando simulações de meta...",
  "Gerando métricas de sessão...",
  "Populando leads e pipeline...",
];

export async function seedDemoData(
  userId: string,
  onStep: (stepIndex: number) => void
) {
  // Step 0: Team Members
  onStep(0);
  const teamRows = [
    ...CLOSER_NAMES.map(name => ({ name, role: "closer", user_id: userId, is_active: true })),
    ...SDR_NAMES.map(name => ({ name, role: "sdr", user_id: userId, is_active: true })),
  ];
  const { data: teamData, error: teamErr } = await supabase.from("team_members").insert(teamRows).select("id, name, role");
  if (teamErr) throw teamErr;
  const members = teamData!;
  const closers = members.filter(m => m.role === "closer");
  const _sdrs = members.filter(m => m.role === "sdr");

  // Step 1: Monthly Snapshots
  onStep(1);
  const monthlyBase = [
    { my: "2025-09", leads: 420, qual: 210, sched: 147, comp: 103, sales: 21, rev: 189000, recv: 151200 },
    { my: "2025-10", leads: 480, qual: 250, sched: 175, comp: 131, sales: 29, rev: 261000, recv: 222000 },
    { my: "2025-11", leads: 510, qual: 265, sched: 186, comp: 140, sales: 35, rev: 332500, recv: 299250 },
    { my: "2025-12", leads: 390, qual: 190, sched: 133, comp: 93, sales: 22, rev: 198000, recv: 168000 },
    { my: "2026-01", leads: 550, qual: 286, sched: 200, comp: 156, sales: 39, rev: 390000, recv: 351000 },
    { my: "2026-02", leads: 490, qual: 255, sched: 179, comp: 139, sales: 34, rev: 340000, recv: 306000 },
  ];
  const snapRows = monthlyBase.map(m => {
    const leads = jitter(m.leads, 0.1);
    const sales = jitter(m.sales, 0.1) || 1;
    const rev = jitter(m.rev, 0.1);
    const recv = jitter(m.recv, 0.1);
    return {
      user_id: userId,
      month_year: m.my,
      leads_generated: leads,
      qualification_rate: Math.round((jitter(m.qual, 0.1) / leads) * 100),
      meetings_booked: jitter(m.sched, 0.1),
      proposals_sent: jitter(m.comp, 0.1),
      deals_closed: sales,
      total_revenue: rev,
      close_rate: Math.round((sales / (jitter(m.comp, 0.1) || 1)) * 100),
      avg_ticket: Math.round(rev / sales),
      total_billed: rev,
      total_received: recv,
    };
  });
  const { error: snapErr } = await supabase.from("monthly_snapshots").insert(snapRows);
  if (snapErr) throw snapErr;

  // Step 2: Daily Seller KPIs (Feb 2026)
  onStep(2);
  const kpiRows: any[] = [];
  for (const member of members) {
    for (const day of WORKING_DAYS_FEB_2026) {
      const dateStr = `2026-02-${String(day).padStart(2, "0")}`;
      if (member.role === "closer") {
        const sales = Math.random() < 0.15 ? randInt(2, 3) : (Math.random() < 0.6 ? randInt(0, 1) : 0);
        kpiRows.push({
          user_id: userId, team_member_id: member.id, date: dateStr,
          leads_generated: 0, leads_qualified: 0, meetings_scheduled: 0,
          meetings_completed: randInt(1, 4), sales,
          revenue: sales * randInt(8000, 12000),
        });
      } else {
        const isSickDay = Math.random() < 0.08;
        const lg = isSickDay ? 0 : randInt(5, 15);
        const lq = Math.round(lg * rand(0.4, 0.6));
        const ms = Math.round(lq * rand(0.5, 0.7));
        kpiRows.push({
          user_id: userId, team_member_id: member.id, date: dateStr,
          leads_generated: lg, leads_qualified: lq, meetings_scheduled: ms,
          meetings_completed: 0, sales: 0, revenue: 0,
        });
      }
    }
  }
  // Insert in batches of 100
  for (let i = 0; i < kpiRows.length; i += 100) {
    const { error } = await supabase.from("daily_seller_kpis").insert(kpiRows.slice(i, i + 100));
    if (error) throw error;
  }

  // Step 3: Ad Metrics (Dec 2025, Jan 2026, Feb 2026)
  onStep(3);
  const adRows: any[] = [];
  const adMonths = [
    { year: 2025, month: 12 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
  ];
  for (const { year, month } of adMonths) {
    const wdays = getWorkingDays(year, month);
    for (const d of wdays) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const clicks = randInt(400, 900);
      const pv = Math.round(clicks * rand(0.70, 0.85));
      adRows.push({
        user_id: userId, date: dateStr,
        investment: Math.round(rand(800, 1500) * 100) / 100,
        impressions: randInt(15000, 35000),
        clicks,
        page_views: pv,
        leads_from_ads: Math.round(pv * rand(0.08, 0.15)),
      });
    }
  }
  const { error: adErr } = await supabase.from("ad_metrics").insert(adRows);
  if (adErr) throw adErr;

  // Step 4: Sales Channels + Monthly Data
  onStep(4);
  const channelNames = ["Tráfego Pago", "Indicação", "Outbound", "Orgânico", "Eventos"];
  const channelInsert = channelNames.map(name => ({ user_id: userId, name, is_active: true }));
  const { data: channelData, error: chErr } = await supabase.from("sales_channels").insert(channelInsert).select("id, name");
  if (chErr) throw chErr;
  const channels = channelData!;
  const pcts: Record<string, number> = { "Tráfego Pago": 0.45, "Indicação": 0.25, "Outbound": 0.15, "Orgânico": 0.10, "Eventos": 0.05 };
  const chMonthlyRows: any[] = [];
  for (const snap of monthlyBase) {
    const [y, m] = snap.my.split("-").map(Number);
    for (const ch of channels) {
      const actual = Math.round(snap.rev * (pcts[ch.name] || 0.1) * rand(0.85, 1.15));
      const target = Math.round(actual * rand(0.9, 1.2));
      chMonthlyRows.push({ user_id: userId, channel_id: ch.id, month: m, year: y, actual, target });
    }
  }
  const { error: cmErr } = await supabase.from("channel_monthly_data").insert(chMonthlyRows);
  if (cmErr) throw cmErr;

  // Step 5: Goal Simulations
  onStep(5);
  const sims = [
    { user_id: userId, target_revenue: 300000, avg_ticket: 9500, conversion_rate: 25, show_rate: 75, scheduling_rate: 30, qualification_rate: 52, working_days: 22, num_sellers: 6 },
    { user_id: userId, target_revenue: 500000, avg_ticket: 10000, conversion_rate: 30, show_rate: 80, scheduling_rate: 35, qualification_rate: 55, working_days: 22, num_sellers: 6 },
  ];
  const { error: simErr } = await supabase.from("goal_simulations").insert(sims);
  if (simErr) throw simErr;

  // Step 6: Session Metrics
  onStep(6);
  const sessionRows: any[] = [
    { user_id: userId, session_date: "2025-11-15", notes: "Revisão de métricas Q4", action_items: "Ajustar metas SDR", key_decisions: "Aumentar investimento em tráfego pago", month: 11, year: 2025, form_completion_rate: jitter(72, 0.1), scheduling_rate: jitter(28, 0.1), attendance_rate: jitter(74, 0.1), noshow_confirmed: jitter(12, 0.1), noshow_unconfirmed: jitter(35, 0.1), reschedule_rate: jitter(18, 0.1), recorded_calls_rate: jitter(85, 0.1), confirmation_rate: jitter(78, 0.1), avg_ticket: jitter(9800, 0.1) },
    { user_id: userId, session_date: "2025-12-10", notes: "Planejamento 2026", action_items: "Definir OKRs", key_decisions: "Contratar 2 closers", month: 12, year: 2025, form_completion_rate: jitter(74, 0.1), scheduling_rate: jitter(30, 0.1), attendance_rate: jitter(76, 0.1), noshow_confirmed: jitter(11, 0.1), noshow_unconfirmed: jitter(33, 0.1), reschedule_rate: jitter(17, 0.1), recorded_calls_rate: jitter(87, 0.1), confirmation_rate: jitter(80, 0.1), avg_ticket: jitter(10000, 0.1) },
    { user_id: userId, session_date: "2026-01-20", notes: "Revisão janeiro", action_items: "Melhorar taxa de show-up", key_decisions: "Implementar lembretes automáticos", month: 1, year: 2026, form_completion_rate: jitter(75, 0.1), scheduling_rate: jitter(31, 0.1), attendance_rate: jitter(77, 0.1), noshow_confirmed: jitter(10, 0.1), noshow_unconfirmed: jitter(30, 0.1), reschedule_rate: jitter(16, 0.1), recorded_calls_rate: jitter(88, 0.1), confirmation_rate: jitter(82, 0.1), avg_ticket: jitter(10200, 0.1) },
    { user_id: userId, session_date: "2026-02-18", notes: "Revisão fevereiro", action_items: "Treinar equipe em objeções", key_decisions: "Novo script de vendas", month: 2, year: 2026, form_completion_rate: jitter(78, 0.1), scheduling_rate: jitter(33, 0.1), attendance_rate: jitter(79, 0.1), noshow_confirmed: jitter(9, 0.1), noshow_unconfirmed: jitter(28, 0.1), reschedule_rate: jitter(15, 0.1), recorded_calls_rate: jitter(90, 0.1), confirmation_rate: jitter(84, 0.1), avg_ticket: jitter(10500, 0.1) },
  ];
  const { error: sessErr } = await supabase.from("session_metrics").insert(sessionRows);
  if (sessErr) throw sessErr;

  // Step 7: Leads + Pipeline Meetings
  onStep(7);
  const stages = ["lead", "qualification", "meeting", "proposal", "closed_won", "closed_lost"];
  const stageWeights = [0.30, 0.25, 0.20, 0.10, 0.10, 0.05];
  const sources = ["traffic", "inbound", "referral", "outbound", "other"];
  const leadRows: any[] = [];
  for (let i = 0; i < 50; i++) {
    const r = Math.random();
    let cumul = 0;
    let stage = "lead";
    for (let s = 0; s < stages.length; s++) {
      cumul += stageWeights[s];
      if (r <= cumul) { stage = stages[s]; break; }
    }
    const day = randInt(1, 26);
    const dateStr = `2026-02-${String(day).padStart(2, "0")}`;
    const assignedMember = members[randInt(0, members.length - 1)];
    const firstName = BRAZILIAN_FIRST[randInt(0, BRAZILIAN_FIRST.length - 1)];
    const lastName = BRAZILIAN_LAST[randInt(0, BRAZILIAN_LAST.length - 1)];
    leadRows.push({
      user_id: userId,
      name: `${firstName} ${lastName}`,
      stage,
      lead_source: sources[randInt(0, sources.length - 1)],
      assigned_to: assignedMember.id,
      created_at: dateStr,
      stage_changed_at: dateStr,
      proposal_value: stage === "proposal" || stage === "closed_won" ? randInt(7000, 15000) : null,
      company: `Empresa ${randInt(100, 999)}`,
    });
  }
  const { data: leadsData, error: leadErr } = await supabase.from("leads").insert(leadRows).select("id, stage, created_at");
  if (leadErr) throw leadErr;

  // Pipeline meetings for leads with meeting/proposal/closed_won
  const meetingLeads = leadsData!.filter(l => ["meeting", "proposal", "closed_won"].includes(l.stage));
  if (meetingLeads.length > 0) {
    const meetingRows = meetingLeads.map(lead => {
      const closer = closers[randInt(0, closers.length - 1)];
      return {
        user_id: userId,
        meeting_date: lead.created_at,
        facilitator: closer.name,
        wins: lead.stage === "closed_won" ? "Venda realizada" : null,
        notes: `Reunião com lead #${lead.id.slice(0, 8)}`,
        week_label: "Fev S4",
      };
    });
    const { error: mtErr } = await supabase.from("pipeline_meetings").insert(meetingRows);
    if (mtErr) throw mtErr;
  }
}

export async function cleanDemoData(userId: string) {
  const tables = [
    "daily_seller_kpis", "ad_metrics", "channel_monthly_data", "sales_channels",
    "goal_simulations", "session_metrics", "leads", "pipeline_meetings",
    "monthly_snapshots", "team_members",
  ];
  for (const table of tables) {
    const { error } = await (supabase.from(table as any) as any).delete().eq("user_id", userId);
    if (error) console.warn(`Failed to clean ${table}:`, error.message);
  }
}

export const DEMO_CLOSER_NAMES = CLOSER_NAMES;
export const DEMO_SDR_NAMES = SDR_NAMES;
