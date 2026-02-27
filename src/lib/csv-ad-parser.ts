import Papa from "papaparse";

export interface ParsedAdRow {
  date: string; // YYYY-MM-DD
  investment: number;
  impressions: number;
  clicks: number;
  page_views: number;
  leads_from_ads: number;
}

export interface ParseResult {
  rows: ParsedAdRow[];
  platform: "Meta Ads" | "Google Ads" | "Desconhecido";
  columnMap: Record<string, string>; // internal field -> original column name
  errors: string[];
}

// Normalize: lowercase, remove accents, collapse whitespace
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type FieldKey = "date" | "investment" | "impressions" | "clicks" | "page_views" | "leads_from_ads";

const ALIASES: Record<FieldKey, string[]> = {
  date: ["dia", "day", "date", "data"],
  investment: [
    "valor gasto", "valor usado (brl)", "amount spent", "amount spent (brl)",
    "custo", "cost", "spend", "valor usado",
  ],
  impressions: ["impressoes", "impressions", "impr.", "impr"],
  clicks: [
    "cliques no link", "cliques (todos)", "link clicks", "clicks (all)",
    "cliques", "clicks",
  ],
  page_views: [
    "visualizacoes da pagina de destino", "landing page views",
    "visualizacoes de pagina", "page views",
  ],
  leads_from_ads: ["leads", "resultados", "results", "conversoes", "conversions"],
};

// Detect platform based on original headers
function detectPlatform(headers: string[]): "Meta Ads" | "Google Ads" | "Desconhecido" {
  const normalized = headers.map(normalize);
  const metaSignals = ["valor gasto", "cliques no link", "visualizacoes da pagina de destino", "amount spent", "link clicks", "landing page views"];
  const googleSignals = ["custo", "cost", "conversoes", "conversions", "impr."];

  let metaScore = 0;
  let googleScore = 0;
  for (const h of normalized) {
    if (metaSignals.some((s) => h.includes(s))) metaScore++;
    if (googleSignals.some((s) => h.includes(s))) googleScore++;
  }
  if (metaScore > googleScore) return "Meta Ads";
  if (googleScore > 0) return "Google Ads";
  return "Desconhecido";
}

function matchField(header: string, aliases: string[]): boolean {
  const h = normalize(header);
  // Exact match
  if (aliases.includes(h)) return true;
  // Starts-with
  if (aliases.some((a) => h.startsWith(a))) return true;
  // Contains
  if (aliases.some((a) => h.includes(a))) return true;
  return false;
}

function mapColumns(headers: string[]): { mapping: Record<FieldKey, number>; columnMap: Record<string, string>; unmapped: FieldKey[] } {
  const mapping: Partial<Record<FieldKey, number>> = {};
  const columnMap: Record<string, string> = {};
  const fields = Object.keys(ALIASES) as FieldKey[];

  for (const field of fields) {
    for (let i = 0; i < headers.length; i++) {
      if (matchField(headers[i], ALIASES[field])) {
        mapping[field] = i;
        columnMap[field] = headers[i];
        break;
      }
    }
  }

  const unmapped = fields.filter((f) => mapping[f] === undefined);
  return { mapping: mapping as Record<FieldKey, number>, columnMap, unmapped };
}

// Parse number handling both 1.234,56 (BR) and 1,234.56 (US)
function parseNum(raw: string | undefined): number {
  if (!raw) return 0;
  const s = raw.trim();
  if (!s) return 0;
  // If has comma and dot: determine format
  if (s.includes(",") && s.includes(".")) {
    // 1.234,56 → BR format
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    }
    // 1,234.56 → US format
    return parseFloat(s.replace(/,/g, "")) || 0;
  }
  // Only comma: could be decimal separator
  if (s.includes(",") && !s.includes(".")) {
    return parseFloat(s.replace(",", ".")) || 0;
  }
  return parseFloat(s) || 0;
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const brMatch = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  }
  // MM/DD/YYYY
  const usMatch = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (usMatch) {
    const m = parseInt(usMatch[1]);
    const d = parseInt(usMatch[2]);
    if (m <= 12 && d <= 31) {
      return `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
    }
  }
  // Try Date constructor
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

export function parseAdsCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const rawRows = result.data as string[][];
        if (rawRows.length < 2) {
          resolve({ rows: [], platform: "Desconhecido", columnMap: {}, errors: ["Arquivo vazio ou sem dados"] });
          return;
        }

        const headers = rawRows[0];
        const platform = detectPlatform(headers);
        const { mapping, columnMap, unmapped } = mapColumns(headers);

        const errors: string[] = [];
        if (!("date" in mapping) || mapping.date === undefined) {
          errors.push("Coluna de data não encontrada");
          resolve({ rows: [], platform, columnMap, errors });
          return;
        }

        // Warn about unmapped optional fields
        const optionalUnmapped = unmapped.filter((f) => f !== "date");
        if (optionalUnmapped.length > 0) {
          errors.push(`Colunas não mapeadas: ${optionalUnmapped.join(", ")}`);
        }

        const rows: ParsedAdRow[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const r = rawRows[i];
          const dateRaw = r[mapping.date];
          if (!dateRaw) continue;
          const date = parseDate(dateRaw);
          if (!date) continue;

          rows.push({
            date,
            investment: mapping.investment !== undefined ? parseNum(r[mapping.investment]) : 0,
            impressions: mapping.impressions !== undefined ? Math.round(parseNum(r[mapping.impressions])) : 0,
            clicks: mapping.clicks !== undefined ? Math.round(parseNum(r[mapping.clicks])) : 0,
            page_views: mapping.page_views !== undefined ? Math.round(parseNum(r[mapping.page_views])) : 0,
            leads_from_ads: mapping.leads_from_ads !== undefined ? Math.round(parseNum(r[mapping.leads_from_ads])) : 0,
          });
        }

        resolve({ rows, platform, columnMap, errors });
      },
      error: () => {
        resolve({ rows: [], platform: "Desconhecido", columnMap: {}, errors: ["Erro ao processar arquivo"] });
      },
    });
  });
}
