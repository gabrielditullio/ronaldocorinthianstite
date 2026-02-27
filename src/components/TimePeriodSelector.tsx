import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTimePeriod, PeriodType, periodTypeLabels } from "@/contexts/TimePeriodContext";

const PERIOD_TYPES: PeriodType[] = ["daily", "weekly", "monthly", "quarterly", "semester", "yearly"];

function getQuarterOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
    const q = Math.floor(d.getMonth() / 3);
    const y = d.getFullYear();
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const qStart = months[q * 3];
    const qEnd = months[q * 3 + 2];
    const key = `${y}-Q${q + 1}`;
    if (!options.find((o) => o.value === key)) {
      options.push({ value: key, label: `Q${q + 1} ${y} (${qStart}-${qEnd})` });
    }
  }
  return options;
}

function getSemesterOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i * 6, 1);
    const s = d.getMonth() < 6 ? 1 : 2;
    const y = d.getFullYear();
    const key = `${y}-S${s}`;
    if (!options.find((o) => o.value === key)) {
      options.push({ value: key, label: `${s}º Sem ${y} (${s === 1 ? "Jan-Jun" : "Jul-Dez"})` });
    }
  }
  return options;
}

function getYearOptions() {
  const now = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - i;
    return { value: String(y), label: String(y) };
  });
}

const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function TimePeriodSelector() {
  const {
    periodType, setPeriodType,
    startDate, endDate, setDateRange,
    compareEnabled, setCompareEnabled,
  } = useTimePeriod();

  const [calOpen, setCalOpen] = useState(false);

  // Month/year selectors for monthly mode
  const currentMonth = startDate.getMonth();
  const currentYear = startDate.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleMonthChange = (m: number) => {
    const start = new Date(currentYear, m, 1);
    const end = new Date(currentYear, m + 1, 0);
    setDateRange(start, end);
  };

  const handleYearChange = (y: number) => {
    if (periodType === "yearly") {
      setDateRange(new Date(y, 0, 1), new Date(y, 11, 31));
    } else {
      const start = new Date(y, currentMonth, 1);
      const end = new Date(y, currentMonth + 1, 0);
      setDateRange(start, end);
    }
  };

  const handleQuarterChange = (val: string) => {
    const [yearStr, qStr] = val.split("-Q");
    const q = parseInt(qStr) - 1;
    const y = parseInt(yearStr);
    setDateRange(new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 0));
  };

  const handleSemesterChange = (val: string) => {
    const [yearStr, sStr] = val.split("-S");
    const s = parseInt(sStr) - 1;
    const y = parseInt(yearStr);
    setDateRange(new Date(y, s * 6, 1), new Date(y, s * 6 + 6, 0));
  };

  const handleWeekNav = (delta: number) => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + delta * 7);
    const newEnd = new Date(newStart);
    newEnd.setDate(newStart.getDate() + 6);
    setDateRange(newStart, newEnd);
  };

  const quarterKey = `${startDate.getFullYear()}-Q${Math.floor(startDate.getMonth() / 3) + 1}`;
  const semesterKey = `${startDate.getFullYear()}-S${startDate.getMonth() < 6 ? 1 : 2}`;

  return (
    <div className="space-y-3">
      {/* Period Type Segmented Control */}
      <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[hsl(30,45%,96%)]">
        {PERIOD_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setPeriodType(t)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              periodType === t
                ? "bg-[hsl(343,44%,25%)] text-white shadow-sm"
                : "text-[hsl(21,12%,37%)] hover:bg-[hsl(30,26%,88%)]"
            )}
          >
            {periodTypeLabels[t]}
          </button>
        ))}
      </div>

      {/* Date Range — varies by period type */}
      <div className="flex flex-wrap items-center gap-2">
        {periodType === "daily" && (
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs gap-2">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(startDate, "dd/MM/yyyy")} — {format(endDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: startDate, to: endDate }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange(range.from, range.to);
                    setCalOpen(false);
                  } else if (range?.from) {
                    setDateRange(range.from, range.from);
                  }
                }}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        )}

        {periodType === "weekly" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleWeekNav(-1)} className="text-xs px-2">←</Button>
            <span className="text-xs font-medium text-foreground">
              {format(startDate, "dd/MM")} — {format(endDate, "dd/MM/yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={() => handleWeekNav(1)} className="text-xs px-2">→</Button>
          </div>
        )}

        {periodType === "monthly" && (
          <div className="flex items-center gap-2">
            <Select value={String(currentMonth)} onValueChange={(v) => handleMonthChange(Number(v))}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_FULL.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(currentYear)} onValueChange={(v) => handleYearChange(Number(v))}>
              <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {periodType === "quarterly" && (
          <Select value={quarterKey} onValueChange={handleQuarterChange}>
            <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getQuarterOptions().map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {periodType === "semester" && (
          <Select value={semesterKey} onValueChange={handleSemesterChange}>
            <SelectTrigger className="w-52 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getSemesterOptions().map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {periodType === "yearly" && (
          <Select value={String(currentYear)} onValueChange={(v) => handleYearChange(Number(v))}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {getYearOptions().map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Compare Toggle */}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-auto">
          <Checkbox
            checked={compareEnabled}
            onCheckedChange={(v) => setCompareEnabled(v === true)}
            className="h-3.5 w-3.5"
          />
          <BarChart3 className="h-3 w-3" />
          Comparar com período anterior
        </label>
      </div>
    </div>
  );
}
