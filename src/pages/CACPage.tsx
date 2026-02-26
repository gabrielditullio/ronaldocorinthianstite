import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Calculator, DollarSign, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    opts.push({ value: key, label: `${months[d.getMonth()]}/${d.getFullYear()}` });
  }
  return opts;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function parseCurrency(v: string): number {
  return Number(v.replace(/[^\d]/g, "")) || 0;
}

function displayCurrency(v: number): string {
  if (v === 0) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
}

export default function CACPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const [marketing, setMarketing] = useState(15000);
  const [sales, setSales] = useState(28000);
  const [tools, setTools] = useState(2000);
  const [newClients, setNewClients] = useState(12);
  const [avgTicket, setAvgTicket] = useState(10500);
  const [calculated, setCalculated] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const totalInvestment = marketing + sales + tools;
  const cac = newClients > 0 ? totalInvestment / newClients : 0;
  const payback = avgTicket > 0 ? cac / avgTicket : 0;
  const ltvRecommended = cac * 4;
  const cacRatio = avgTicket > 0 ? (cac / avgTicket) * 100 : 0;

  const efficiency = cacRatio < 30 ? "green" : cacRatio <= 40 ? "yellow" : "red";

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["cac-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cac_calculations")
        .select("*")
        .order("month_year", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Pre-fill if month exists
  useEffect(() => {
    const existing = history.find((h) => h.month_year === selectedMonth);
    if (existing) {
      setMarketing(Number(existing.marketing_investment) || 15000);
      setSales(Number(existing.sales_investment) || 28000);
      setTools(Number(existing.tools_investment) || 2000);
      setNewClients(existing.new_clients || 12);
      setAvgTicket(Number(existing.avg_ticket) || 10500);
      setExistingId(existing.id);
      setCalculated(true);
    } else {
      setExistingId(null);
      setCalculated(false);
    }
  }, [history, selectedMonth]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        marketing_investment: marketing,
        sales_investment: sales,
        tools_investment: tools,
        total_investment: totalInvestment,
        new_clients: newClients,
        avg_ticket: avgTicket,
        cac: Math.round(cac),
        payback_months: Math.round(payback * 10) / 10,
        month_year: selectedMonth,
        user_id: user!.id,
      };
      if (existingId) {
        const { error } = await supabase.from("cac_calculations").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cac_calculations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cac-history"] });
      setCalculated(true);
      toast.success("Cálculo salvo!");
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const CurrencyInput = ({ value, onChange, id }: { value: number; onChange: (v: number) => void; id: string }) => (
    <Input
      id={id}
      value={displayCurrency(value)}
      onChange={(e) => onChange(parseCurrency(e.target.value))}
      placeholder="R$ 0"
    />
  );

  const paybackColor = payback < 3 ? "text-success" : payback <= 6 ? "text-accent" : "text-destructive";
  const effLabel = efficiency === "green" ? "VERDE ✓ Saudável" : efficiency === "yellow" ? "AMARELO — Atenção" : "VERMELHO ✗ Crítico";
  const effBg = efficiency === "green" ? "bg-success" : efficiency === "yellow" ? "bg-warning" : "bg-destructive";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Calculadora de CAC</h1>
          <p className="text-muted-foreground">Quanto custa cada cliente?</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Dados de Investimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Mês de Referência</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    {monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="mkt">Investimento em Marketing (mês)</Label>
                <CurrencyInput id="mkt" value={marketing} onChange={setMarketing} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales">Investimento em Vendas (salários)</Label>
                <CurrencyInput id="sales" value={sales} onChange={setSales} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tools">Investimento em Ferramentas</Label>
                <CurrencyInput id="tools" value={tools} onChange={setTools} />
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Total Investimento</p>
                <p className="text-lg font-bold">{formatBRL(totalInvestment)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="clients">Clientes Novos (mês)</Label>
                  <Input id="clients" type="number" min={0} value={newClients} onChange={(e) => setNewClients(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ticket">Ticket Médio</Label>
                  <CurrencyInput id="ticket" value={avgTicket} onChange={setAvgTicket} />
                </div>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || newClients === 0}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Calcular e Salvar
              </Button>
            </CardContent>
          </Card>

          {/* Outputs */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 mb-3">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">CAC — Custo de Aquisição</p>
                <p className="text-3xl font-extrabold mt-1">{formatBRL(cac)}</p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Payback</p>
                  <p className={`text-2xl font-bold ${paybackColor}`}>{payback.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">meses</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ShieldCheck className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">LTV Recomendado</p>
                  <p className="text-xl font-bold">{formatBRL(ltvRecommended)}</p>
                  <p className="text-[10px] text-muted-foreground">Mínimo por cliente</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Eficiência</p>
                <Badge className={`${effBg} text-white text-sm px-4 py-1`}>{effLabel}</Badge>
                <p className="mt-2 text-xs text-muted-foreground">CAC = {cacRatio.toFixed(0)}% do ticket médio</p>
              </CardContent>
            </Card>
            <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
              <strong>REGRA DE OURO:</strong> CAC &lt; 30% do ticket médio. Payback &lt; 3 meses.
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Histórico de CAC</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-center">CAC</TableHead>
                    <TableHead className="text-center">Payback</TableHead>
                    <TableHead className="text-center">Investimento</TableHead>
                    <TableHead className="text-center">Clientes</TableHead>
                    <TableHead className="text-center">Eficiência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => {
                    const hCac = Number(h.cac) || 0;
                    const hTicket = Number(h.avg_ticket) || 1;
                    const hRatio = (hCac / hTicket) * 100;
                    const hEff = hRatio < 30 ? "green" : hRatio <= 40 ? "yellow" : "red";
                    const hEffBg = hEff === "green" ? "bg-success" : hEff === "yellow" ? "bg-warning" : "bg-destructive";
                    const mo = getMonthOptions().find((o) => o.value === h.month_year);
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{mo?.label || h.month_year}</TableCell>
                        <TableCell className="text-center">{formatBRL(hCac)}</TableCell>
                        <TableCell className="text-center">{Number(h.payback_months)?.toFixed(1) || "—"}m</TableCell>
                        <TableCell className="text-center">{formatBRL(Number(h.total_investment) || 0)}</TableCell>
                        <TableCell className="text-center">{h.new_clients || 0}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${hEffBg} text-white text-xs`}>{hRatio.toFixed(0)}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
