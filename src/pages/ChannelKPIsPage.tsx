import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFunnel } from "@/contexts/FunnelContext";
import { useToast } from "@/hooks/use-toast";
import { Save, ChevronLeft, ChevronRight } from "lucide-react";

interface SalesChannel {
  id: string;
  name: string;
  is_active: boolean;
}

interface WeeklyKPI {
  id?: string;
  channel_id: string;
  month_year: string;
  week_number: number;
  leads_total: number;
  leads_total_meta: number;
  leads_qualified: number;
  leads_qualified_meta: number;
  calls_scheduled: number;
  calls_scheduled_meta: number;
  calls_completed: number;
  calls_completed_meta: number;
  attendance_rate: number;
  attendance_rate_meta: number;
  sales: number;
  sales_meta: number;
  conversion_rate: number;
  conversion_rate_meta: number;
}

const KPI_ROWS = [
  { key: "leads_total", label: "Total de Leads no Funil", isPercent: false },
  { key: "leads_qualified", label: "Leads Qualificados", isPercent: false },
  { key: "calls_scheduled", label: "Calls Agendadas", isPercent: false },
  { key: "calls_completed", label: "Calls Realizadas", isPercent: false },
  { key: "attendance_rate", label: "Taxa de Presença", isPercent: true },
  { key: "sales", label: "Vendas", isPercent: false },
  { key: "conversion_rate", label: "Taxa de Conversão", isPercent: true },
] as const;

type KPIKey = typeof KPI_ROWS[number]["key"];

const WEEKS = [1, 2, 3, 4, 5];

function emptyWeek(channelId: string, monthYear: string, week: number): WeeklyKPI {
  return {
    channel_id: channelId,
    month_year: monthYear,
    week_number: week,
    leads_total: 0, leads_total_meta: 0,
    leads_qualified: 0, leads_qualified_meta: 0,
    calls_scheduled: 0, calls_scheduled_meta: 0,
    calls_completed: 0, calls_completed_meta: 0,
    attendance_rate: 0, attendance_rate_meta: 0,
    sales: 0, sales_meta: 0,
    conversion_rate: 0, conversion_rate_meta: 0,
  };
}

export default function ChannelKPIsPage() {
  const { user } = useAuth();
  const { selectedFunnelId } = useFunnel();
  const { toast } = useToast();

  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [monthYear, setMonthYear] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyKPI[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Fetch channels
  useEffect(() => {
    if (!user) return;
    supabase
      .from("sales_channels")
      .select("id, name, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at")
      .then(({ data }) => {
        if (data) {
          setChannels(data);
          if (data.length > 0 && !selectedChannel) setSelectedChannel(data[0].id);
        }
      });
  }, [user]);

  // Fetch KPI data when channel or month changes
  useEffect(() => {
    if (!user || !selectedChannel) return;
    supabase
      .from("channel_weekly_kpis")
      .select("*")
      .eq("channel_id", selectedChannel)
      .eq("month_year", monthYear)
      .order("week_number")
      .then(({ data }) => {
        const existing = (data || []) as any[];
        const weeks = WEEKS.map((w) => {
          const found = existing.find((r: any) => r.week_number === w);
          return found ? { ...found } : emptyWeek(selectedChannel, monthYear, w);
        });
        setWeeklyData(weeks);
        setDirty(false);
      });
  }, [user, selectedChannel, monthYear]);

  const updateCell = useCallback((weekIdx: number, field: string, value: number) => {
    setWeeklyData((prev) => {
      const copy = [...prev];
      copy[weekIdx] = { ...copy[weekIdx], [field]: value };
      return copy;
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!user || !selectedChannel) return;
    setSaving(true);
    try {
      for (const week of weeklyData) {
        const payload = {
          user_id: user.id,
          channel_id: selectedChannel,
          funnel_id: selectedFunnelId || null,
          month_year: monthYear,
          week_number: week.week_number,
          leads_total: week.leads_total,
          leads_total_meta: week.leads_total_meta,
          leads_qualified: week.leads_qualified,
          leads_qualified_meta: week.leads_qualified_meta,
          calls_scheduled: week.calls_scheduled,
          calls_scheduled_meta: week.calls_scheduled_meta,
          calls_completed: week.calls_completed,
          calls_completed_meta: week.calls_completed_meta,
          attendance_rate: week.attendance_rate,
          attendance_rate_meta: week.attendance_rate_meta,
          sales: week.sales,
          sales_meta: week.sales_meta,
          conversion_rate: week.conversion_rate,
          conversion_rate_meta: week.conversion_rate_meta,
        };

        if (week.id) {
          await supabase.from("channel_weekly_kpis").update(payload).eq("id", week.id);
        } else {
          const { data } = await supabase.from("channel_weekly_kpis").insert(payload).select("id").single();
          if (data) week.id = data.id;
        }
      }
      setDirty(false);
      toast({ title: "Dados salvos com sucesso!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  // Totals
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    KPI_ROWS.forEach((kpi) => {
      t[kpi.key] = weeklyData.reduce((s, w) => s + ((w as any)[kpi.key] || 0), 0);
      t[`${kpi.key}_meta`] = weeklyData.reduce((s, w) => s + ((w as any)[`${kpi.key}_meta`] || 0), 0);
    });
    return t;
  }, [weeklyData]);

  const changeMonth = (delta: number) => {
    const [y, m] = monthYear.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthYear(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = monthYear.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [monthYear]);

  const channelName = channels.find((c) => c.id === selectedChannel)?.name || "";

  if (channels.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Funil por Canal de Vendas</h1>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum canal de vendas ativo. Crie canais em <strong>Canais de Venda</strong> primeiro.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Funil por Canal de Vendas</h1>
          <Button onClick={handleSave} disabled={saving || !dirty} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Selecione um canal" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold capitalize min-w-[140px] text-center">{monthLabel}</span>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI Table */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg uppercase">{channelName}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-sidebar">
                  <TableHead rowSpan={2} className="text-sidebar-foreground font-bold border-r min-w-[180px] sticky left-0 bg-sidebar z-10">KPI</TableHead>
                  {WEEKS.map((w) => (
                    <TableHead key={w} colSpan={2} className="text-sidebar-foreground font-bold text-center border-r">
                      SEMANA {w}
                    </TableHead>
                  ))}
                  <TableHead colSpan={3} className="text-sidebar-foreground font-bold text-center">CONSOLIDADO</TableHead>
                </TableRow>
                <TableRow className="bg-sidebar/80">
                  {WEEKS.map((w) => (
                    <React.Fragment key={w}>
                      <TableHead className="text-sidebar-foreground/80 text-center text-xs min-w-[70px]">Resultado</TableHead>
                      <TableHead className="text-sidebar-foreground/80 text-center text-xs border-r min-w-[70px]">Meta</TableHead>
                    </React.Fragment>
                  ))}
                  <TableHead className="text-sidebar-foreground/80 text-center text-xs min-w-[70px]">Total</TableHead>
                  <TableHead className="text-sidebar-foreground/80 text-center text-xs min-w-[70px]">Meta</TableHead>
                  <TableHead className="text-sidebar-foreground/80 text-center text-xs min-w-[60px]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {KPI_ROWS.map((kpi, rowIdx) => {
                  const totalResult = totals[kpi.key] || 0;
                  const totalMeta = totals[`${kpi.key}_meta`] || 0;
                  const pct = totalMeta > 0 ? Math.round((totalResult / totalMeta) * 100) : 0;
                  const isHighlight = kpi.key === "calls_completed" || kpi.key === "attendance_rate";

                  return (
                    <TableRow key={kpi.key} className={`${rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30"} ${isHighlight ? "bg-accent/20" : ""}`}>
                      <TableCell className="font-semibold text-sm border-r sticky left-0 bg-inherit z-10">
                        {kpi.label}
                      </TableCell>
                      {WEEKS.map((w, wIdx) => (
                        <React.Fragment key={w}>
                          <TableCell className="p-1">
                            <Input
                              type="number"
                              step={kpi.isPercent ? "0.1" : "1"}
                              className="h-8 text-center text-sm w-full"
                              value={(weeklyData[wIdx] as any)?.[kpi.key] || ""}
                              onChange={(e) => updateCell(wIdx, kpi.key, Number(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="p-1 border-r">
                            <Input
                              type="number"
                              step={kpi.isPercent ? "0.1" : "1"}
                              className="h-8 text-center text-sm w-full"
                              value={(weeklyData[wIdx] as any)?.[`${kpi.key}_meta`] || ""}
                              onChange={(e) => updateCell(wIdx, `${kpi.key}_meta`, Number(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </TableCell>
                        </React.Fragment>
                      ))}
                      <TableCell className="text-center font-bold text-sm">
                        {kpi.isPercent ? `${totalResult.toFixed(1)}%` : totalResult}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-sm text-muted-foreground">
                        {kpi.isPercent ? `${totalMeta.toFixed(1)}%` : totalMeta}
                      </TableCell>
                      <TableCell className={`text-center font-bold text-sm ${pct >= 100 ? "text-green-600" : pct >= 70 ? "text-amber-600" : "text-destructive"}`}>
                        {totalMeta > 0 ? `${pct}%` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import React from "react";
