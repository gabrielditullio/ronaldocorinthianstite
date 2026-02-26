export interface Lead {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  stage: string;
  previous_stage: string | null;
  stage_changed_at: string | null;
  proposal_value: number | null;
  assigned_to: string | null;
  lead_source: string | null;
  notes: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LeadFormData {
  id?: string;
  name: string;
  company: string;
  stage: string;
  proposal_value: number | null;
  assigned_to: string | null;
  lead_source: string | null;
  notes: string;
  contact_email: string;
  contact_phone: string;
}

export interface Filters {
  assignedTo: string;
  source: string;
  stages: string[];
  dateFrom: string;
  dateTo: string;
}

export const STAGES = [
  { key: "lead", label: "Lead", color: "bg-blue-100 border-blue-400 text-blue-800" },
  { key: "qualification", label: "Qualificação", color: "bg-purple-100 border-purple-400 text-purple-800" },
  { key: "meeting", label: "Meeting", color: "bg-indigo-100 border-indigo-400 text-indigo-800" },
  { key: "proposal", label: "Proposta", color: "bg-orange-100 border-orange-400 text-orange-800" },
  { key: "closed_won", label: "Fechado ✓", color: "bg-green-100 border-green-400 text-green-800" },
  { key: "closed_lost", label: "Perdido", color: "bg-gray-100 border-gray-400 text-gray-600" },
] as const;

export const STAGE_BORDER_COLORS: Record<string, string> = {
  lead: "border-l-blue-400",
  qualification: "border-l-purple-400",
  meeting: "border-l-indigo-400",
  proposal: "border-l-orange-400",
  closed_won: "border-l-green-500",
  closed_lost: "border-l-gray-400",
};

export const SOURCES = [
  { key: "traffic", label: "Tráfego" },
  { key: "inbound", label: "Inbound" },
  { key: "referral", label: "Indicação" },
  { key: "outbound", label: "Prospecção" },
  { key: "other", label: "Outro" },
];

export function formatBRL(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function daysInStage(stageChangedAt: string | null): number {
  if (!stageChangedAt) return 0;
  const diff = Date.now() - new Date(stageChangedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
