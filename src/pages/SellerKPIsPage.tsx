import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
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
import { Users, TrendingUp, Target, Calendar } from "lucide-react";
import { MoMIndicator } from "@/components/MoMIndicator";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

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
}

export default function SellerKPIsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [viewAll, setViewAll] = useState(false);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [allSellersData, setAllSellersData] = useState<Record<string, DayRow[]>>({});
  const [prevTotals, setPrevTotals] = useState<{ sales: number; revenue: number; leads: number; meetings_scheduled: number; meetings_completed: number } | null>(null);

  const totalDays = daysInMonth(month, year);

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

  // Fetch KPIs for selected seller (current + previous month)
  useEffect(() => {
    if (!user || !selectedSeller || viewAll) return;
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`;

    // Previous month
    const prevDate = new Date(year, month - 1, 1);
    const prevY = prevDate.getFullYear();
    const prevM = prevDate.getMonth();
    const prevDays = daysInMonth(prevM, prevY);
    const prevStartDate = `${prevY}-${String(prevM + 1).padStart(2, "0")}-01`;
    const prevEndDate = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(prevDays).padStart(2, "0")}`;

    Promise.all([
      supabase.from("daily_seller_kpis").select("*")
        .eq("user_id", user.id).eq("team_member_id", selectedSeller)
        .gte("date", startDate).lte("date", endDate),
      supabase.from("daily_seller_kpis").select("*")
        .eq("user_id", user.id).eq("team_member_id", selectedSeller)
        .gte("date", prevStartDate).lte("date", prevEndDate),
    ]).then(([{ data }, { data: prevData }]) => {
      const mapped: Record<number, DayRow> = {};
      data?.forEach((r: any) => {
        const d = new Date(r.date).getDate();
        mapped[d] = {
          day: d,
          leads_generated: r.leads_generated ?? 0,
          leads_qualified: r.leads_qualified ?? 0,
          meetings_scheduled: r.meetings_scheduled ?? 0,
          meetings_completed: r.meetings_completed ?? 0,
          sales: r.sales ?? 0,
          revenue: Number(r.revenue) || 0,
        };
      });
      const newRows: DayRow[] = [];
      for (let i = 1; i <= totalDays; i++) {
        newRows.push(mapped[i] || { day: i, leads_generated: 0, leads_qualified: 0, meetings_scheduled: 0, meetings_completed: 0, sales: 0, revenue: 0 });
      }
      setRows(newRows);

      // Previous month totals
      if (prevData && prevData.length > 0) {
        const pt = { sales: 0, revenue: 0, leads: 0, meetings_scheduled: 0, meetings_completed: 0 };
        prevData.forEach((r: any) => {
          pt.sales += r.sales ?? 0;
          pt.revenue += Number(r.revenue) || 0;
          pt.leads += r.leads_generated ?? 0;
          pt.meetings_scheduled += r.meetings_scheduled ?? 0;
          pt.meetings_completed += r.meetings_completed ?? 0;
        });
        setPrevTotals(pt);
      } else {
        setPrevTotals(null);
      }
    });
  }, [user, selectedSeller, month, year, viewAll, totalDays]);

  // Fetch all sellers data for consolidated view
  useEffect(() => {
    if (!user || !viewAll) return;
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`;

    supabase.from("daily_seller_kpis").select("*")
      .eq("user_id", user.id)
      .gte("date", startDate).lte("date", endDate)
      .then(({ data }) => {
        const grouped: Record<string, DayRow[]> = {};
        data?.forEach((r: any) => {
          if (!grouped[r.team_member_id]) grouped[r.team_member_id] = [];
          grouped[r.team_member_id].push({
            day: new Date(r.date).getDate(),
            leads_generated: r.leads_generated ?? 0,
            leads_qualified: r.leads_qualified ?? 0,
            meetings_scheduled: r.meetings_scheduled ?? 0,
            meetings_completed: r.meetings_completed ?? 0,
            sales: r.sales ?? 0,
            revenue: Number(r.revenue) || 0,
          });
        });
        setAllSellersData(grouped);
      });
  }, [user, viewAll, month, year, totalDays]);

  const totals = useMemo(() => {
    const t = { leads_generated: 0, leads_qualified: 0, meetings_scheduled: 0, meetings_completed: 0, sales: 0, revenue: 0 };
    rows.forEach(r => { t.leads_generated += r.leads_generated; t.leads_qualified += r.leads_qualified; t.meetings_scheduled += r.meetings_scheduled; t.meetings_completed += r.meetings_completed; t.sales += r.sales; t.revenue += r.revenue; });
    return t;
  }, [rows]);

  const avgTicket = totals.sales > 0 ? totals.revenue / totals.sales : 0;
  const conversionRate = totals.leads_generated > 0 ? (totals.sales / totals.leads_generated) * 100 : 0;
  const showRate = totals.meetings_scheduled > 0 ? (totals.meetings_completed / totals.meetings_scheduled) * 100 : 0;
  const activeDays = rows.filter(r => r.leads_generated > 0 || r.meetings_scheduled > 0 || r.sales > 0).length;
  const meetingsPerDay = activeDays > 0 ? totals.meetings_completed / activeDays : 0;

  const updateRow = (day: number, field: keyof DayRow, value: number) => {
    setRows(prev => prev.map(r => r.day === day ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!user || !selectedSeller) return;
    setSaving(true);
    const records = rows.filter(r => r.leads_generated || r.leads_qualified || r.meetings_scheduled || r.meetings_completed || r.sales || r.revenue).map(r => ({
      user_id: user.id,
      team_member_id: selectedSeller,
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`,
      leads_generated: r.leads_generated,
      leads_qualified: r.leads_qualified,
      meetings_scheduled: r.meetings_scheduled,
      meetings_completed: r.meetings_completed,
      sales: r.sales,
      revenue: r.revenue,
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
      const t = { leads: 0, sales: 0, revenue: 0, meetings_scheduled: 0, meetings_completed: 0 };
      data.forEach(r => { t.leads += r.leads_generated; t.sales += r.sales; t.revenue += r.revenue; t.meetings_scheduled += r.meetings_scheduled; t.meetings_completed += r.meetings_completed; });
      return {
        id: tm.id, name: tm.name,
        leads: t.leads, sales: t.sales, revenue: t.revenue,
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
    ["leads", "sales", "revenue", "conversion", "avgTicket"].forEach(k => {
      m[k] = Math.max(...consolidatedRows.map(r => (r as any)[k] || 0), 0);
    });
    return m;
  }, [consolidatedRows]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const monthYearOptions = [];
  for (let y = year - 1; y <= year + 1; y++) {
    for (let m = 0; m < 12; m++) {
      monthYearOptions.push({ label: `${MONTHS_PT[m]} ${y}`, value: `${y}-${m}` });
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">KPIs por Vendedor</h1>
          <Select value={`${year}-${month}`} onValueChange={v => { const [y, m] = v.split("-"); setYear(+y); setMonth(+m); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{monthYearOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          {!viewAll && (
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Selecionar Vendedor" /></SelectTrigger>
              <SelectContent>{teamMembers.map(tm => <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={viewAll} onCheckedChange={setViewAll} />
            <Label>Ver Todos</Label>
          </div>
        </div>

        {!viewAll && (
          <>
            {/* Performance cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Total Vendas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.sales}</p><p className="text-xs text-muted-foreground">Ticket Médio: R$ {avgTicket.toFixed(2)}</p><div className="mt-1"><MoMIndicator current={totals.sales} previous={prevTotals?.sales ?? null} format={v => String(v)} /></div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Target className="h-4 w-4" />Taxa Conversão</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p><div className="mt-1"><MoMIndicator current={conversionRate} previous={prevTotals && prevTotals.leads > 0 ? (prevTotals.sales / prevTotals.leads) * 100 : null} format={v => `${v.toFixed(1)}%`} /></div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Show Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{showRate.toFixed(1)}%</p><div className="mt-1"><MoMIndicator current={showRate} previous={prevTotals && prevTotals.meetings_scheduled > 0 ? (prevTotals.meetings_completed / prevTotals.meetings_scheduled) * 100 : null} format={v => `${v.toFixed(1)}%`} /></div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" />Reuniões/Dia</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{meetingsPerDay.toFixed(1)}</p></CardContent></Card>
            </div>

            {/* Daily grid */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#5B2333] hover:bg-[#5B2333]">
                        {["Dia","Leads","Qualificados","Agendadas","Realizadas","Vendas","Faturamento"].map(h => (
                          <TableHead key={h} className="text-white font-semibold text-center">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={r.day} className={i % 2 === 0 ? "bg-[#FAF6F0]" : "bg-white"}>
                          <TableCell className="text-center font-medium w-16">{String(r.day).padStart(2, "0")}</TableCell>
                          {(["leads_generated","leads_qualified","meetings_scheduled","meetings_completed","sales","revenue"] as const).map(f => (
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
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={2} className="text-right font-medium">Ticket Médio:</TableCell>
                        <TableCell className="font-bold">R$ {avgTicket.toFixed(2)}</TableCell>
                        <TableCell colSpan={2} className="text-right font-medium">Taxa de Conversão:</TableCell>
                        <TableCell colSpan={2} className="font-bold">{conversionRate.toFixed(1)}%</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="bg-[#5B2333] hover:bg-[#5B2333]/90 text-white">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </>
        )}

        {viewAll && (
          <Card>
            <CardHeader><CardTitle>Comparativo de Vendedores — {MONTHS_PT[month]} {year}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#5B2333] hover:bg-[#5B2333]">
                    {[{k:"name",l:"Vendedor"},{k:"leads",l:"Leads"},{k:"sales",l:"Vendas"},{k:"revenue",l:"Faturamento"},{k:"conversion",l:"Conversão"},{k:"avgTicket",l:"Ticket Médio"}].map(c => (
                      <TableHead key={c.k} className="text-white font-semibold cursor-pointer select-none" onClick={() => handleSort(c.k)}>
                        {c.l} {sortCol === c.k ? (sortAsc ? "↑" : "↓") : ""}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedConsolidated.map((r, i) => (
                    <TableRow key={r.id} className={i % 2 === 0 ? "bg-[#FAF6F0]" : "bg-white"}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className={r.leads === maxValues.leads && r.leads > 0 ? "text-green-600 font-bold" : ""}>{r.leads}</TableCell>
                      <TableCell className={r.sales === maxValues.sales && r.sales > 0 ? "text-green-600 font-bold" : ""}>{r.sales}</TableCell>
                      <TableCell className={r.revenue === maxValues.revenue && r.revenue > 0 ? "text-green-600 font-bold" : ""}>R$ {r.revenue.toFixed(2)}</TableCell>
                      <TableCell className={r.conversion === maxValues.conversion && r.conversion > 0 ? "text-green-600 font-bold" : ""}>{r.conversion.toFixed(1)}%</TableCell>
                      <TableCell className={r.avgTicket === maxValues.avgTicket && r.avgTicket > 0 ? "text-green-600 font-bold" : ""}>R$ {r.avgTicket.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {sortedConsolidated.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum dado encontrado para este mês.</TableCell></TableRow>
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
