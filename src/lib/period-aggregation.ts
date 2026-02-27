/**
 * Aggregation helpers for time period data.
 * SUM-based: leads, sales, revenue, investment, impressions, clicks
 * WEIGHTED AVERAGE: rates calculated from totals, not averaged monthly rates
 */

export interface MonthlySnapshot {
  month_year: string;
  total_revenue: number | null;
  deals_closed: number | null;
  leads_generated: number | null;
  meetings_booked: number | null;
  proposals_sent: number | null;
  qualification_rate: number | null;
  close_rate: number | null;
  avg_ticket: number | null;
  [key: string]: any;
}

export interface AggregatedMetrics {
  leadsGenerated: number;
  dealsClosed: number;
  totalRevenue: number;
  meetingsBooked: number;
  proposalsSent: number;
  qualificationRate: number;
  closeRate: number;
  avgTicket: number;
  conversionRate: number;
}

export function aggregateSnapshots(snapshots: MonthlySnapshot[]): AggregatedMetrics {
  const sums = {
    leadsGenerated: 0,
    dealsClosed: 0,
    totalRevenue: 0,
    meetingsBooked: 0,
    proposalsSent: 0,
  };

  for (const s of snapshots) {
    sums.leadsGenerated += s.leads_generated || 0;
    sums.dealsClosed += s.deals_closed || 0;
    sums.totalRevenue += s.total_revenue || 0;
    sums.meetingsBooked += s.meetings_booked || 0;
    sums.proposalsSent += s.proposals_sent || 0;
  }

  // Weighted rates from totals
  const qualificationRate = sums.leadsGenerated > 0
    ? (sums.meetingsBooked / sums.leadsGenerated) * 100
    : 0;
  const closeRate = sums.proposalsSent > 0
    ? (sums.dealsClosed / sums.proposalsSent) * 100
    : 0;
  const conversionRate = sums.leadsGenerated > 0
    ? (sums.dealsClosed / sums.leadsGenerated) * 100
    : 0;
  const avgTicket = sums.dealsClosed > 0
    ? sums.totalRevenue / sums.dealsClosed
    : 0;

  return {
    ...sums,
    qualificationRate,
    closeRate,
    conversionRate,
    avgTicket,
  };
}

/**
 * Filter snapshots by month_year keys that fall within date range
 */
export function filterSnapshotsByRange(snapshots: MonthlySnapshot[], start: Date, end: Date): MonthlySnapshot[] {
  const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
  return snapshots.filter((s) => s.month_year >= startKey && s.month_year <= endKey);
}

/**
 * Group snapshots by a time bucket for chart X-axis
 */
export type ChartBucket = "daily" | "weekly" | "monthly" | "quarterly" | "semester" | "yearly";

export interface ChartPoint {
  label: string;
  revenue: number;
  monthYears: string[]; // source month_year keys
}

const SHORT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function bucketSnapshots(snapshots: MonthlySnapshot[], bucket: ChartBucket): ChartPoint[] {
  if (snapshots.length === 0) return [];

  switch (bucket) {
    case "daily":
    case "weekly":
    case "monthly":
      return snapshots.map((s) => {
        const [y, m] = s.month_year.split("-");
        return {
          label: `${SHORT_MONTHS[parseInt(m) - 1]}/${y.slice(2)}`,
          revenue: s.total_revenue || 0,
          monthYears: [s.month_year],
        };
      });

    case "quarterly": {
      const groups: Record<string, MonthlySnapshot[]> = {};
      for (const s of snapshots) {
        const [y, m] = s.month_year.split("-");
        const q = Math.floor((parseInt(m) - 1) / 3) + 1;
        const key = `${y}-Q${q}`;
        (groups[key] = groups[key] || []).push(s);
      }
      return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, snaps]) => ({
          label: key,
          revenue: snaps.reduce((s, r) => s + (r.total_revenue || 0), 0),
          monthYears: snaps.map((s) => s.month_year),
        }));
    }

    case "semester": {
      const groups: Record<string, MonthlySnapshot[]> = {};
      for (const s of snapshots) {
        const [y, m] = s.month_year.split("-");
        const sem = parseInt(m) <= 6 ? 1 : 2;
        const key = `${sem}ºS/${y.slice(2)}`;
        (groups[key] = groups[key] || []).push(s);
      }
      return Object.entries(groups)
        .sort(([, a], [, b]) => a[0].month_year.localeCompare(b[0].month_year))
        .map(([key, snaps]) => ({
          label: key,
          revenue: snaps.reduce((s, r) => s + (r.total_revenue || 0), 0),
          monthYears: snaps.map((s) => s.month_year),
        }));
    }

    case "yearly": {
      const groups: Record<string, MonthlySnapshot[]> = {};
      for (const s of snapshots) {
        const y = s.month_year.split("-")[0];
        (groups[y] = groups[y] || []).push(s);
      }
      return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, snaps]) => ({
          label: key,
          revenue: snaps.reduce((s, r) => s + (r.total_revenue || 0), 0),
          monthYears: snaps.map((s) => s.month_year),
        }));
    }
  }
}
