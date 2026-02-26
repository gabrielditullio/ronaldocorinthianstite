import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STAGE_CONFIG = [
  { key: "lead", label: "Lead", color: "#3B82F6" },
  { key: "qualification", label: "Qualificação", color: "#8B5CF6" },
  { key: "meeting", label: "Meeting", color: "#6366F1" },
  { key: "proposal", label: "Proposta", color: "#F39C12" },
  { key: "closed_won", label: "Fechado ✓", color: "#27AE60" },
];

interface Lead { stage: string; }

export function FunnelChart({ leads }: { leads: Lead[] }) {
  const data = useMemo(() =>
    STAGE_CONFIG.map((s) => ({
      name: s.label,
      count: leads.filter((l) => l.stage === s.key).length,
      color: s.color,
    })),
    [leads]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Funil de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lead cadastrado ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" width={90} fontSize={12} />
              <Tooltip
                formatter={(value: number) => [value, "Leads"]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
