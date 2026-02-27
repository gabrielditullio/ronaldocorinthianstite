import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

export type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "semester" | "yearly";

export const periodTypeLabels: Record<PeriodType, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semester: "Semestral",
  yearly: "Anual",
};

export interface TimePeriodState {
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  compareEnabled: boolean;
  prevStartDate: Date | null;
  prevEndDate: Date | null;
  periodLabel: string;
}

interface TimePeriodContextType extends TimePeriodState {
  setPeriodType: (t: PeriodType) => void;
  setStartDate: (d: Date) => void;
  setEndDate: (d: Date) => void;
  setCompareEnabled: (v: boolean) => void;
  setDateRange: (start: Date, end: Date) => void;
}

const TimePeriodContext = createContext<TimePeriodContextType | null>(null);

const STORAGE_KEY = "raio-x-period-type";

function getMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function getMonthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function getDefaultRange(periodType: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  switch (periodType) {
    case "daily": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    case "weekly": {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
    case "monthly":
      return { start: getMonthStart(now), end: getMonthEnd(now) };
    case "quarterly": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), q * 3, 1),
        end: new Date(now.getFullYear(), q * 3 + 3, 0),
      };
    }
    case "semester": {
      const s = now.getMonth() < 6 ? 0 : 6;
      return {
        start: new Date(now.getFullYear(), s, 1),
        end: new Date(now.getFullYear(), s + 6, 0),
      };
    }
    case "yearly":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31),
      };
  }
}

function getPreviousPeriod(periodType: PeriodType, start: Date, end: Date): { start: Date; end: Date } {
  const durationMs = end.getTime() - start.getTime();
  switch (periodType) {
    case "daily": {
      const prevEnd = new Date(start.getTime() - 86400000);
      const prevStart = new Date(prevEnd.getTime() - durationMs);
      return { start: prevStart, end: prevEnd };
    }
    case "weekly": {
      const prevStart = new Date(start);
      prevStart.setDate(start.getDate() - 7);
      const prevEnd = new Date(end);
      prevEnd.setDate(end.getDate() - 7);
      return { start: prevStart, end: prevEnd };
    }
    case "monthly": {
      const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
      return { start: prevStart, end: prevEnd };
    }
    case "quarterly": {
      const prevStart = new Date(start.getFullYear(), start.getMonth() - 3, 1);
      const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
      return { start: prevStart, end: prevEnd };
    }
    case "semester": {
      const prevStart = new Date(start.getFullYear(), start.getMonth() - 6, 1);
      const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
      return { start: prevStart, end: prevEnd };
    }
    case "yearly": {
      const prevStart = new Date(start.getFullYear() - 1, 0, 1);
      const prevEnd = new Date(start.getFullYear() - 1, 11, 31);
      return { start: prevStart, end: prevEnd };
    }
  }
}

function formatPeriodLabel(periodType: PeriodType, start: Date, end: Date): string {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const fullMonths = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  switch (periodType) {
    case "daily":
      return `${fmt(start)} — ${fmt(end)}`;
    case "weekly": {
      const weekNum = Math.ceil(((start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
      return `Semana ${weekNum}, ${start.getFullYear()}: ${fmt(start)} - ${fmt(end)}`;
    }
    case "monthly":
      return `${fullMonths[start.getMonth()]} ${start.getFullYear()}`;
    case "quarterly": {
      const q = Math.floor(start.getMonth() / 3) + 1;
      const qStart = months[start.getMonth()];
      const qEnd = months[start.getMonth() + 2];
      return `Q${q} ${start.getFullYear()} (${qStart}-${qEnd})`;
    }
    case "semester": {
      const s = start.getMonth() < 6 ? 1 : 2;
      return `${s}º Sem ${start.getFullYear()} (${s === 1 ? "Jan-Jun" : "Jul-Dez"})`;
    }
    case "yearly":
      return String(start.getFullYear());
  }
}

export function TimePeriodProvider({ children }: { children: ReactNode }) {
  const [periodType, setPeriodTypeState] = useState<PeriodType>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as PeriodType | null;
      if (stored && stored in periodTypeLabels) return stored;
    } catch {}
    return "monthly";
  });

  const defaultRange = getDefaultRange(periodType);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [compareEnabled, setCompareEnabled] = useState(false);

  const setPeriodType = useCallback((t: PeriodType) => {
    setPeriodTypeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
    const range = getDefaultRange(t);
    setStartDate(range.start);
    setEndDate(range.end);
  }, []);

  const setDateRange = useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const prev = useMemo(() => {
    if (!compareEnabled) return { start: null, end: null };
    return getPreviousPeriod(periodType, startDate, endDate);
  }, [compareEnabled, periodType, startDate, endDate]);

  const periodLabel = useMemo(() => formatPeriodLabel(periodType, startDate, endDate), [periodType, startDate, endDate]);

  return (
    <TimePeriodContext.Provider
      value={{
        periodType, startDate, endDate, compareEnabled,
        prevStartDate: prev.start, prevEndDate: prev.end,
        periodLabel,
        setPeriodType, setStartDate, setEndDate, setCompareEnabled, setDateRange,
      }}
    >
      {children}
    </TimePeriodContext.Provider>
  );
}

export function useTimePeriod() {
  const ctx = useContext(TimePeriodContext);
  if (!ctx) throw new Error("useTimePeriod must be used within TimePeriodProvider");
  return ctx;
}

// Utility: format date for Supabase queries (local timezone safe)
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Get month_year keys covered by a date range
export function getMonthYearKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}
