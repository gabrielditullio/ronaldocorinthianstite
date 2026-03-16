import { useState, useEffect, useMemo } from "react";
import { EmptyState } from "@/components/ui/page-states";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TimePeriodSelector } from "@/components/TimePeriodSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, Target, Calendar, Phone, DollarSign } from "lucide-react";
import { MoMIndicator } from "@/components/MoMIndicator";
import { useTimePeriod, toLocalDateString } from "@/contexts/TimePeriodContext";

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface DayRow {
  day: number;
  leads_generated: number;
  leads_qualified: number;
  meetings_scheduled: number;
  meetings_completed: number;
  sales: number;
  revenue: number;
  net_revenue: number;
}

export default function SellerKPIsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const timePeriod = useTimePeriod();
  const { startDate, endDate, compareEnabled } = timePeriod;
  const month = startDate.getMonth();
  const year = startDate.getFullYear();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [viewAll, setViewAll] = useState(false);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [allSellersData, setAllSellersData] = useState<Record<string, any[]>>({});
  const [prevTotals, setPrevTotals] = useState<{ sales: number; revenue: number; net_revenue: number; leads: number; qualified: number; meetings_scheduled: number; meetings_completed: number } | null>(null);

  const totalDays = new Date(year, month + 1, 0).getDate();

  const selectedMember = teamMembers.find(tm => tm.id === selectedSeller);
  const isCloser = selectedMember?.role === "closer";
  const isSdr = selectedMember?.role === "sdr";

  // Fetch team members
  useEffect(() => {
    if (!user) return;
    supabase.from("team_members").select("id, name, role").eq("user_id", user.id).eq("is_active", true)
      .then(({ data }) => {
        if (data) {
          setTeamMembers(data);
          if (data.length > 0 && !selectedSeller) setSelectedSeller(data[0].id);
        }
      });
  }, [user]);

  // Fetch KPIs for selected seller (current + previous period)
  useEffect(() => {
    if (!user || !selectedSeller || viewAll) return;
    const startDateStr = toLocalDateString(startDate);
    const endDateStr = toLocalDateString(endDate);

    const prevDate = new Date(year, month - 1, 1);
    const prevY = prevDate.getFullYear();
    const prevM = prevDate.getMonth();
    const prevDays = new Date(prevY, prevM + 1, 0).getDate();
    const prevStartDate = `${prevY}-${String(prevM + 1).padStart(2, "0")}-01`;
    const prevEndDate = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(prevDays).padStart(2, "0")}`;

    Promise.all([
      supabase.from("daily_seller_kpis").select("*")
        .eq("user_id", user.id).eq("team_member_id", selectedSeller)
        .gte("date", startDateStr).lte("date", endDateStr),
      supabase.from("daily_seller_kpis").select("*")
        .eq("user_id", user.id).eq("team_member_id", selectedSeller)
        .gte("date", prevStartDate).lte("date", prevEndDate),
    ]).then(([{ data }, { data: prevData }]) => {
      const mapped: Record<number, DayRow> = {};
      data?.forEach((r: any) => {
        // Parse date string directly to avoid timezone issues (date is "YYYY-MM-DD")
        const parts = (r.date as string).split("-");
        const d = parseInt(parts[2], 10);
        mapped[d] = {
          day: d,
          leads_generated: r.leads_generated ?? 0,
          leads_qualified: r.leads_qualified ?? 0,
          meetings_scheduled: r.meetings_scheduled ?? 0,
          meetings_completed: r.meetings_completed ?? 0,
          sales: r.sales ?? 0,
          revenue: Number(r.revenue) || 0,
          net_revenue: Number(r.net_revenue) || 0,
        };
      });
      const newRows: DayRow[] = [];
      for (let i = 1; i <= totalDays; i++) {
        newRows.push(mapped[i] || { day: i, leads_generated: 0, leads_qualified: 0, meetings_scheduled: 0, meetings_completed: 0, sales: 0, revenue: 0, net_revenue: 0 });
      }
      setRows(newRows);

      if (prevData && prevData.length > 0) {
        const pt = { sales: 0, revenue: 0, net_revenue: 0, leads: 0, qualified: 0, meetings_scheduled: 0, meetings_completed: 0 };
        prevData.forEach((r: any) => {
          pt.sales += r.sales ?? 0;
          pt.revenue += Number(r.revenue) || 0;
          pt.net_revenue += Number(r.net_revenue) || 0;
          pt.leads += r.leads_generated ?? 0;
          pt.qualified += r.leads_qualified ?? 0;
          pt.meetings_scheduled += r.meetings_scheduled ?? 0;
          pt.meetings_completed += r.meetings_completed ?? 0;
        });
        setPrevTotals(pt);
      } else {
        setPrevTotals(null);
      }
    });
  }, [user, selectedSeller, month, year, viewAll, totalDays, startDate, endDate]);

  // Fetch all sellers data for consolidated view
  useEffect(() => {
    if (!user || !viewAll) return;
    const startDateStr = toLocalDateString(startDate);
    const endDateStr = toLocalDateString(endDate);

    supabase.from("daily_seller_kpis").select("*")
      .eq("user_id", user.id)
      .gte("date", startDateStr).lte("date", endDateStr)
      .then(({ data }) => {
        const grouped: Record<string, any[]> = {};
        data?.forEach((r: any) => {
          if (!grouped[r.team_member_id]) grouped[r.team_member_id] = [];
          grouped[r.team_member_id].push(r);
        });
        setAllSellersData(grouped);
      });
  }, [user, viewAll, month, year, totalDays, startDate, endDate]);

  const totals = useMemo(() => {
    const t = { leads_generated: 0, leads_qualified: 0, meetings_scheduled: 0, meetings_completed: 0, sales: 0, revenue: 0, net_revenue: 0 };
    rows.forEach(r => { t.leads_generated += r.leads_generated; t.leads_qualified += r.leads_qualified; t.meetings_scheduled += r.meetings_scheduled; t.meetings_completed += r.meetings_completed; t.sales += r.sales; t.revenue += r.revenue; t.net_revenue += r.net_revenue; });
    return t;
  }, [rows]);

  const avgTicket = totals.sales > 0 ? totals.revenue / totals.sales : 0;

  // SDR-specific metrics
  const sdrQualRate = totals.leads_generated > 0 ? (totals.leads_qualified / totals.leads_generated) * 100 : 0;
  const sdrSchedulingRate = totals.leads_qualified > 0 ? (totals.meetings_scheduled / totals.leads_qualified) * 100 : 0;
  const sdrShowRate = totals.meetings_scheduled > 0 ? (totals.meetings_completed / totals.meetings_scheduled) * 100 : 0;

  // Closer-specific metrics
  const closerCloseRate = totals.meetings_completed > 0 ? (totals.sales / totals.meetings_completed) * 100 : 0;

  const updateRow = (day: number, field: keyof DayRow, value: any) => {
    setRows(prev => prev.map(r => r.day === day ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!user || !selectedSeller) return;
    setSaving(true);
    const records = rows.filter(r => r.leads_generated || r.leads_qualified || r.meetings_scheduled || r.meetings_completed || r.sales || r.revenue || r.net_revenue).map(r => ({
      user_id: user.id,
      team_member_id: selectedSeller,
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`,
      leads_generated: r.leads_generated,
      leads_qualified: r.leads_qualified,
      meetings_scheduled: r.meetings_scheduled,
      meetings_completed: r.meetings_completed,
      sales: r.sales,
      revenue: r.revenue,
      net_revenue: r.net_revenue,
    }));
    if (records.length > 0) {
      const { error } = await supabase.from("daily_seller_kpis").upsert(records, { onConflict: "user_id,team_member_id,date" });
      if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      else toast({ title: "Dados salvos com sucesso!" });
    }
    setSaving(false);
  };

  // Consolidated view data
  const consolidatedRows = useMemo(() => {
    return teamMembers.map(tm => {
      const data = allSellersData[tm.id] || [];
      const t = { leads: 0, qualified: 0, sales: 0, revenue: 0, net_revenue: 0, meetings_scheduled: 0, meetings_completed: 0 };
      data.forEach((r: any) => { t.leads += r.leads_generated ?? 0; t.qualified += r.leads_qualified ?? 0; t.sales += r.sales ?? 0; t.revenue += Number(r.revenue) || 0; t.net_revenue += Number(r.net_revenue) || 0; t.meetings_scheduled += r.meetings_scheduled ?? 0; t.meetings_completed += r.meetings_completed ?? 0; });

      return {
        id: tm.id, name: tm.name, role: tm.role,
        leads: t.leads, qualified: t.qualified, sales: t.sales, revenue: t.revenue, net_revenue: t.net_revenue,
        meetings_scheduled: t.meetings_scheduled, meetings_completed: t.meetings_completed,
        conversion: t.leads > 0 ? (t.sales / t.leads * 100) : 0,
        avgTicket: t.sales > 0 ? t.revenue / t.sales : 0,
      };
    });
  }, [teamMembers, allSellersData]);

  const [sortCol, setSortCol] = useState<string>("revenue");
  const [sortAsc, setSortAsc] = useState(false);
  const sortedConsolidated = useMemo(() => {
    return [...consolidatedRows].sort((a, b) => {
      const va = (a as any)[sortCol] ?? 0;
      const vb = (b as any)[sortCol] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
  }, [consolidatedRows, sortCol, sortAsc]);

  const maxValues = useMemo(() => {
    const m: Record<string, number> = {};
    ["leads", "sales", "revenue", "net_revenue", "conversion", "avgTicket"].forEach(k => {
      m[k] = Math.max(...consolidatedRows.map(r => (r as any)[k] || 0), 0);
    });
    return m;
  }, [consolidatedRows]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  // Role-specific performance cards
  const renderPerformanceCards = () => {
    if (isSdr) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Leads Gerados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.leads_generated}</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.leads_generated} previous={prevTotals?.leads ?? null} format={v => String(v)} /></div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Target className="h-4 w-4" />Qualificação</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.leads_qualified}</p><p className="text-xs text-muted-foreground">Taxa: {sdrQualRate.toFixed(1)}%</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.leads_qualified} previous={prevTotals?.qualified ?? null} format={v => String(v)} /></div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" />Agendamento</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.meetings_scheduled}</p><p className="text-xs text-muted-foreground">Taxa: {sdrSchedulingRate.toFixed(1)}%</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.meetings_scheduled} previous={prevTotals?.meetings_scheduled ?? null} format={v => String(v)} /></div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" />Show Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{sdrShowRate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{totals.meetings_completed}/{totals.meetings_scheduled} reuniões</p></CardContent></Card>
        </div>
      );
    }

    if (isCloser) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" />Reuniões Realizadas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.meetings_completed}</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.meetings_completed} previous={prevTotals?.meetings_completed ?? null} format={v => String(v)} /></div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Vendas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.sales}</p><p className="text-xs text-muted-foreground">Conversão: {closerCloseRate.toFixed(1)}%</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.sales} previous={prevTotals?.sales ?? null} format={v => String(v)} /></div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Target className="h-4 w-4" />Conversão</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{closerCloseRate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">vendas / realizadas</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Receita</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">R$ {totals.net_revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.net_revenue} previous={prevTotals?.net_revenue ?? null} format={v => `R$ ${v.toFixed(0)}`} /></div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Faturamento</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">R$ {totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p><p className="text-xs text-muted-foreground">Ticket: R$ {avgTicket.toFixed(0)}</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.revenue} previous={prevTotals?.revenue ?? null} format={v => `R$ ${v.toFixed(0)}`} /></div>}</CardContent></Card>
        </div>
      );
    }

    // Default (generic / fullcycle)
    const conversionRate = totals.leads_generated > 0 ? (totals.sales / totals.leads_generated) * 100 : 0;
    const showRate = totals.meetings_scheduled > 0 ? (totals.meetings_completed / totals.meetings_scheduled) * 100 : 0;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Total Vendas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.sales}</p><p className="text-xs text-muted-foreground">Ticket Médio: R$ {avgTicket.toFixed(2)}</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.sales} previous={prevTotals?.sales ?? null} format={v => String(v)} /></div>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Target className="h-4 w-4" />Taxa Conversão</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={conversionRate} previous={prevTotals && prevTotals.leads > 0 ? (prevTotals.sales / prevTotals.leads) * 100 : null} format={v => `${v.toFixed(1)}%`} /></div>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Show Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{showRate.toFixed(1)}%</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={showRate} previous={prevTotals && prevTotals.meetings_scheduled > 0 ? (prevTotals.meetings_completed / prevTotals.meetings_scheduled) * 100 : null} format={v => `${v.toFixed(1)}%`} /></div>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Faturamento</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">R$ {totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>{compareEnabled && <div className="mt-1"><MoMIndicator current={totals.revenue} previous={prevTotals?.revenue ?? null} format={v => `R$ ${v.toFixed(0)}`} /></div>}</CardContent></Card>
      </div>
    );
  };

  // Table headers: same for all roles now (no SDR column)
  const tableHeaders = ["Dia", "Leads", "Qualificados", "Agendadas", "Realizadas", "Vendas", "Faturamento", "Receita"];
  const tableFields: (keyof DayRow)[] = ["leads_generated", "leads_qualified", "meetings_scheduled", "meetings_completed", "sales", "revenue", "net_revenue"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPIs por Vendedor</h1>
        </div>

        <TimePeriodSelector />

        <div className="flex flex-wrap items-center gap-4">
          {!viewAll && (
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Selecionar Vendedor" /></SelectTrigger>
              <SelectContent>{teamMembers.map(tm => <SelectItem key={tm.id} value={tm.id}>{tm.name} ({tm.role === "sdr" ? "SDR" : tm.role === "closer" ? "Closer" : "Vendedor"})</SelectItem>)}</SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={viewAll} onCheckedChange={setViewAll} />
            <Label>Ver Todos</Label>
          </div>
        </div>

        {!viewAll && teamMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Adicione vendedores para começar a rastrear"
            description="Cadastre membros do time para registrar KPIs diários."
            actionLabel="Gerenciar Equipe"
            actionTo="/team"
          />
        ) : !viewAll && (
          <>
            {renderPerformanceCards()}

            {/* Daily grid */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto [&_table_td:first-child]:sticky [&_table_td:first-child]:left-0 [&_table_td:first-child]:z-10 [&_table_td:first-child]:bg-inherit [&_table_th:first-child]:sticky [&_table_th:first-child]:left-0 [&_table_th:first-child]:z-10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#5B2333] hover:bg-[#5B2333]">
                        {tableHeaders.map(h => (
                          <TableHead key={h} className="text-white font-semibold text-center">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={r.day} className={i % 2 === 0 ? "bg-[#FAF6F0]" : "bg-white"}>
                          <TableCell className="text-center font-medium w-16">{String(r.day).padStart(2, "0")}</TableCell>
                          {tableFields.map(f => (
                            <TableCell key={f} className="p-1">
                              <Input type="number" min={0} className="h-8 text-center text-sm" value={r[f] || ""} onChange={e => updateRow(r.day, f, Number(e.target.value) || 0)} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted font-bold">
                        <TableCell className="text-center">TOTAL</TableCell>
                        <TableCell className="text-center">{totals.leads_generated}</TableCell>
                        <TableCell className="text-center">{totals.leads_qualified}</TableCell>
                        <TableCell className="text-center">{totals.meetings_scheduled}</TableCell>
                        <TableCell className="text-center">{totals.meetings_completed}</TableCell>
                        <TableCell className="text-center">{totals.sales}</TableCell>
                        <TableCell className="text-center">R$ {totals.revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-center">R$ {totals.net_revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-[#5B2333] hover:bg-[#5B2333]/90 text-white">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </>
        )}

        {viewAll && (
          <Card>
            <CardHeader><CardTitle>Comparativo de Vendedores</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#5B2333] hover:bg-[#5B2333]">
                    {[{k:"name",l:"Vendedor"},{k:"leads",l:"Leads"},{k:"sales",l:"Vendas"},{k:"revenue",l:"Faturamento"},{k:"net_revenue",l:"Receita"},{k:"conversion",l:"Conversão"},{k:"avgTicket",l:"Ticket Médio"}].map(c => (
                      <TableHead key={c.k} className="text-white font-semibold cursor-pointer select-none" onClick={() => handleSort(c.k)}>
                        {c.l} {sortCol === c.k ? (sortAsc ? "↑" : "↓") : ""}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedConsolidated.map((r, i) => (
                    <TableRow key={r.id} className={i % 2 === 0 ? "bg-[#FAF6F0]" : "bg-white"}>
                      <TableCell className="font-medium">
                        {r.name}
                        <span className="text-xs text-muted-foreground ml-1">({r.role === "sdr" ? "SDR" : r.role === "closer" ? "Closer" : "Vendedor"})</span>
                      </TableCell>
                      <TableCell className={r.leads === maxValues.leads && r.leads > 0 ? "text-green-600 font-bold" : ""}>{r.leads}</TableCell>
                      <TableCell className={r.sales === maxValues.sales && r.sales > 0 ? "text-green-600 font-bold" : ""}>{r.sales}</TableCell>
                      <TableCell className={r.revenue === maxValues.revenue && r.revenue > 0 ? "text-green-600 font-bold" : ""}>R$ {r.revenue.toFixed(2)}</TableCell>
                      <TableCell className={r.net_revenue === maxValues.net_revenue && r.net_revenue > 0 ? "text-green-600 font-bold" : ""}>R$ {r.net_revenue.toFixed(2)}</TableCell>
                      <TableCell className={r.conversion === maxValues.conversion && r.conversion > 0 ? "text-green-600 font-bold" : ""}>{r.conversion.toFixed(1)}%</TableCell>
                      <TableCell className={r.avgTicket === maxValues.avgTicket && r.avgTicket > 0 ? "text-green-600 font-bold" : ""}>R$ {r.avgTicket.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {sortedConsolidated.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum dado encontrado para este mês.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
