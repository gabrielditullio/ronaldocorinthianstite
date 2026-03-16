import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface SellerKpi {
  team_member_id: string;
  leads_generated: number;
  leads_qualified: number;
  meetings_scheduled: number;
  meetings_completed: number;
  sales: number;
  revenue: number;
  [key: string]: any;
}

interface TeamMember {
  id: string;
  name: string;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

export function SellerSummaryTable({
  sellerKpis,
  teamMembers,
}: {
  sellerKpis: SellerKpi[];
  teamMembers: TeamMember[];
}) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const map: Record<string, {
      leads: number; qualified: number; scheduled: number; completed: number; sales: number; revenue: number;
    }> = {};

    sellerKpis.forEach((k) => {
      if (!map[k.team_member_id]) {
        map[k.team_member_id] = { leads: 0, qualified: 0, scheduled: 0, completed: 0, sales: 0, revenue: 0 };
      }
      const r = map[k.team_member_id];
      r.leads += k.leads_generated ?? 0;
      r.qualified += k.leads_qualified ?? 0;
      r.scheduled += k.meetings_scheduled ?? 0;
      r.completed += k.meetings_completed ?? 0;
      r.sales += k.sales ?? 0;
      r.revenue += Number(k.revenue) || 0;
    });

    return teamMembers
      .filter((tm) => map[tm.id])
      .map((tm) => ({
        id: tm.id,
        name: tm.name,
        ...map[tm.id],
        conversion: map[tm.id].leads > 0 ? (map[tm.id].sales / map[tm.id].leads) * 100 : 0,
      }));
  }, [sellerKpis, teamMembers]);

  const totals = useMemo(() => {
    const t = { leads: 0, qualified: 0, scheduled: 0, completed: 0, sales: 0, revenue: 0 };
    rows.forEach((r) => {
      t.leads += r.leads;
      t.qualified += r.qualified;
      t.scheduled += r.scheduled;
      t.completed += r.completed;
      t.sales += r.sales;
      t.revenue += r.revenue;
    });
    return { ...t, conversion: t.leads > 0 ? (t.sales / t.leads) * 100 : 0 };
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resumo por Vendedor</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Qualificados</TableHead>
              <TableHead className="text-right">Reuniões Ag.</TableHead>
              <TableHead className="text-right">Reuniões Real.</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => navigate(`/kpis-vendedores?seller=${r.id}`)}
              >
                <TableCell className="font-medium text-primary underline-offset-4 hover:underline">
                  {r.name}
                </TableCell>
                <TableCell className="text-right">{r.leads}</TableCell>
                <TableCell className="text-right">{r.qualified}</TableCell>
                <TableCell className="text-right">{r.scheduled}</TableCell>
                <TableCell className="text-right">{r.completed}</TableCell>
                <TableCell className="text-right">{r.sales}</TableCell>
                <TableCell className="text-right">{formatBRL(r.revenue)}</TableCell>
                <TableCell className="text-right">{r.conversion.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">TOTAL</TableCell>
              <TableCell className="text-right font-bold">{totals.leads}</TableCell>
              <TableCell className="text-right font-bold">{totals.qualified}</TableCell>
              <TableCell className="text-right font-bold">{totals.scheduled}</TableCell>
              <TableCell className="text-right font-bold">{totals.completed}</TableCell>
              <TableCell className="text-right font-bold">{totals.sales}</TableCell>
              <TableCell className="text-right font-bold">{formatBRL(totals.revenue)}</TableCell>
              <TableCell className="text-right font-bold">{totals.conversion.toFixed(1)}%</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
