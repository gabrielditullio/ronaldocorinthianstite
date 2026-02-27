export const leadSourceLabels: Record<string, string> = {
  'traffic': 'Tráfego Pago',
  'inbound': 'Orgânico',
  'referral': 'Indicação',
  'outbound': 'Outbound',
  'other': 'Outro',
};

export const stageLabels: Record<string, string> = {
  'lead': 'Novo Lead',
  'qualification': 'Em Qualificação',
  'meeting': 'Reunião Agendada',
  'proposal': 'Proposta Enviada',
  'closed_won': 'Convertido',
  'closed_lost': 'Perdido',
};

export const funnelTypeLabels: Record<string, string> = {
  'high_ticket': 'High Ticket Direto',
  'diagnostic': 'Funil Diagnóstico',
  'low_ticket': 'Low Ticket',
  'launch': 'Lançamento',
  'perpetual': 'Perpétuo',
  'custom': 'Personalizado',
};

export const funnelTypeColors: Record<string, string> = {
  'high_ticket': 'bg-[hsl(343,44%,25%)] text-white border-transparent',
  'diagnostic': 'bg-[hsl(210,60%,45%)] text-white border-transparent',
  'low_ticket': 'bg-[hsl(152,55%,40%)] text-white border-transparent',
  'launch': 'bg-[hsl(30,89%,50%)] text-white border-transparent',
  'perpetual': 'bg-[hsl(270,50%,45%)] text-white border-transparent',
  'custom': 'bg-muted text-muted-foreground border-transparent',
};
