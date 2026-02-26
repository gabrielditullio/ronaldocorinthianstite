import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PieChart, Pie, Cell } from "recharts";

function getWorkingDays(year: number, month: number): number[] {
  const days: number[] = [];
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= totalDays; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) days.push(d);
  }
  return days;
}

type DayStatus = "complete" | "partial" | "empty" | "weekend";

export function AdherenceCard() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [dayStatuses, setDayStatuses] = useState<Record<number, DayStatus>>({});

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const workingDays = useMemo(() => getWorkingDays(year, month), [year, month]);
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    if (!user) return;
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const startDate = `${monthStr}-01`;
    const endDate = `${monthStr}-${String(totalDaysInMonth).padStart(2, "0")}`;

    const fetchData = async () => {
      try {
        const [kpisRes, leadsRes, adsRes] = await Promise.all([
          supabase.from("daily_seller_kpis").select("date").eq("user_id", user.id).gte("date", startDate).lte("date", endDate),
          supabase.from("leads").select("created_at").eq("user_id", user.id).gte("created_at", `${startDate}T00:00:00`).lte("created_at", `${endDate}T23:59:59`),
          supabase.from("ad_metrics" as any).select("date").eq("user_id", user.id).gte("date", startDate).lte("date", endDate),
        ]);

        const sourcesPerDay: Record<number, Set<string>> = {};
        const addDay = (dateStr: string, source: string) => {
          const d = new Date(dateStr).getDate();
          if (!sourcesPerDay[d]) sourcesPerDay[d] = new Set();
          sourcesPerDay[d].add(source);
        };

        kpisRes.data?.forEach((r: any) => addDay(r.date, "kpis"));
        leadsRes.data?.forEach((r: any) => addDay(r.created_at, "leads"));
        (adsRes.data as any[])?.forEach((r: any) => addDay(r.date, "ads"));

        const statuses: Record<number, DayStatus> = {};
        for (let d = 1; d <= totalDaysInMonth; d++) {
          const dow = new Date(year, month, d).getDay();
          if (dow === 0 || dow === 6) {
            statuses[d] = "weekend";
          } else {
            const sources = sourcesPerDay[d];
            if (!sources || sources.size === 0) statuses[d] = "empty";
            else if (sources.size >= 2) statuses[d] = "complete";
            else statuses[d] = "partial";
          }
        }
        setDayStatuses(statuses);
      } catch (error) {
        console.error("Error fetching adherence data:", error);
      }
    };
    fetchData();
  }, [user, year, month, totalDaysInMonth]);

  const daysWithData = workingDays.filter(d => {
    const s = dayStatuses[d];
    return s === "complete" || s === "partial";
  }).length;

  // Only count working days up to today
  const today = now.getDate();
  const workingDaysUpToToday = workingDays.filter(d => d <= today).length;
  const adherence = workingDaysUpToToday > 0 ? (daysWithData / workingDaysUpToToday) * 100 : 0;

  const colorClass = adherence < 50 ? "text-red-500" : adherence < 70 ? "text-orange-500" : adherence < 85 ? "text-blue-500" : "text-green-500";
  const fillColor = adherence < 50 ? "#ef4444" : adherence < 70 ? "#f97316" : adherence < 85 ? "#3b82f6" : "#22c55e";

  const gaugeData = [
    { value: Math.min(adherence, 100) },
    { value: Math.max(100 - adherence, 0) },
  ];

  const statusColor = (s: DayStatus) => {
    switch (s) {
      case "complete": return "bg-green-500";
      case "partial": return "bg-yellow-400";
      case "empty": return "bg-red-400";
      case "weekend": return "bg-muted";
      default: return "bg-muted";
    }
  };

  const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <Card className="w-full cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-center">
          <div className="relative">
            <PieChart width={100} height={100}>
              <Pie
                data={gaugeData}
                cx={45}
                cy={45}
                innerRadius={30}
                outerRadius={42}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={fillColor} />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${colorClass}`}>{Math.round(adherence)}%</span>
            </div>
          </div>
        </div>
        <p className="text-center text-sm font-semibold text-foreground">Aderência</p>
        <p className="text-center text-xs text-[#6B5C54]">
          {daysWithData} de {workingDaysUpToToday} dias preenchidos
        </p>

        {expanded && (
          <div className="pt-3 border-t mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">{MONTHS_PT[month]} {year}</p>
            <div className="grid grid-cols-7 gap-1">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i} className="text-[10px] text-center text-muted-foreground font-medium">{d}</span>
              ))}
              {/* Offset for first day of month */}
              {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: totalDaysInMonth }, (_, i) => {
                const day = i + 1;
                const status = dayStatuses[day] || "weekend";
                return (
                  <div
                    key={day}
                    className={`h-5 w-5 rounded-sm flex items-center justify-center text-[9px] font-medium ${statusColor(status)} ${status === "weekend" ? "text-muted-foreground" : "text-white"}`}
                    title={`Dia ${day}: ${status === "complete" ? "Completo" : status === "partial" ? "Parcial" : status === "empty" ? "Sem dados" : "Fim de semana"}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-500" />Completo</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-yellow-400" />Parcial</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-400" />Vazio</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
