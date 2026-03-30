import Papa from "papaparse";

export interface MetaAdsCampaignRow {
  report_start_date: string;
  report_end_date: string;
  campaign_name: string;
  delivery_status: string;
  results: number;
  result_indicator: string;
  cost_per_result: number;
  ad_set_budget: number;
  budget_type: string;
  amount_spent: number;
  impressions: number;
  reach: number;
  end_date: string;
  attribution_setting: string;
}

export interface MetaAdsParseResult {
  rows: MetaAdsCampaignRow[];
  errors: string[];
  totalSpent: number;
  totalImpressions: number;
  totalReach: number;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

const COLUMN_MAP: Record<string, string[]> = {
  report_start_date: ["inicio dos relatorios", "reporting starts"],
  report_end_date: ["termino dos relatorios", "reporting ends"],
  campaign_name: ["nome da campanha", "campaign name"],
  delivery_status: ["veiculacao da campanha", "delivery", "campaign delivery"],
  results: ["resultados", "results"],
  result_indicator: ["indicador de resultados", "result indicator"],
  cost_per_result: ["custo por resultados", "cost per result"],
  ad_set_budget: ["orcamento do conjunto de anuncios", "ad set budget"],
  budget_type: ["tipo de orcamento do conjunto de anuncios", "budget type"],
  amount_spent: ["valor usado (brl)", "valor usado", "valor gasto", "amount spent", "amount spent (brl)"],
  impressions: ["impressoes", "impressions"],
  reach: ["alcance", "reach"],
  end_date: ["termino", "end date"],
  attribution_setting: ["configuracao de atribuicao", "attribution setting"],
};

function matchColumn(header: string): string | null {
  const h = normalize(header);
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.some(a => h === a || h.includes(a))) return field;
  }
  return null;
}

function parseNum(raw: string | undefined): number {
  if (!raw) return 0;
  const s = raw.trim();
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(s.replace(/,/g, "")) || 0;
  }
  if (s.includes(",") && !s.includes(".")) {
    return parseFloat(s.replace(",", ".")) || 0;
  }
  return parseFloat(s) || 0;
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const brMatch = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

export function parseMetaAdsCsv(file: File): Promise<MetaAdsParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const rawRows = result.data as string[][];
        if (rawRows.length < 2) {
          resolve({ rows: [], errors: ["Arquivo vazio ou sem dados"], totalSpent: 0, totalImpressions: 0, totalReach: 0 });
          return;
        }

        const headers = rawRows[0];
        const mapping: Record<string, number> = {};
        const errors: string[] = [];

        headers.forEach((h, i) => {
          const field = matchColumn(h);
          if (field) mapping[field] = i;
        });

        if (!mapping.campaign_name && mapping.campaign_name !== 0) {
          errors.push("Coluna 'Nome da campanha' não encontrada");
          resolve({ rows: [], errors, totalSpent: 0, totalImpressions: 0, totalReach: 0 });
          return;
        }

        const rows: MetaAdsCampaignRow[] = [];
        let totalSpent = 0, totalImpressions = 0, totalReach = 0;

        for (let i = 1; i < rawRows.length; i++) {
          const r = rawRows[i];
          const campaignName = r[mapping.campaign_name]?.trim();
          if (!campaignName) continue;

          const startDate = mapping.report_start_date != null ? parseDate(r[mapping.report_start_date] || "") : null;
          const endDate = mapping.report_end_date != null ? parseDate(r[mapping.report_end_date] || "") : null;

          const spent = mapping.amount_spent != null ? parseNum(r[mapping.amount_spent]) : 0;
          const impr = mapping.impressions != null ? Math.round(parseNum(r[mapping.impressions])) : 0;
          const rch = mapping.reach != null ? Math.round(parseNum(r[mapping.reach])) : 0;

          totalSpent += spent;
          totalImpressions += impr;
          totalReach += rch;

          rows.push({
            report_start_date: startDate || "",
            report_end_date: endDate || "",
            campaign_name: campaignName,
            delivery_status: mapping.delivery_status != null ? r[mapping.delivery_status]?.trim() || "" : "",
            results: mapping.results != null ? Math.round(parseNum(r[mapping.results])) : 0,
            result_indicator: mapping.result_indicator != null ? r[mapping.result_indicator]?.trim() || "" : "",
            cost_per_result: mapping.cost_per_result != null ? parseNum(r[mapping.cost_per_result]) : 0,
            ad_set_budget: mapping.ad_set_budget != null ? parseNum(r[mapping.ad_set_budget]) : 0,
            budget_type: mapping.budget_type != null ? r[mapping.budget_type]?.trim() || "" : "",
            amount_spent: spent,
            impressions: impr,
            reach: rch,
            end_date: mapping.end_date != null ? r[mapping.end_date]?.trim() || "" : "",
            attribution_setting: mapping.attribution_setting != null ? r[mapping.attribution_setting]?.trim() || "" : "",
          });
        }

        const unmapped = Object.keys(COLUMN_MAP).filter(k => mapping[k] == null);
        if (unmapped.length > 0 && unmapped.length < Object.keys(COLUMN_MAP).length) {
          errors.push(`Colunas não mapeadas: ${unmapped.join(", ")}`);
        }

        resolve({ rows, errors, totalSpent, totalImpressions, totalReach });
      },
      error: () => {
        resolve({ rows: [], errors: ["Erro ao processar arquivo"], totalSpent: 0, totalImpressions: 0, totalReach: 0 });
      },
    });
  });
}
