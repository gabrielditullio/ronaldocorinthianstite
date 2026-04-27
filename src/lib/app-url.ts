// URL pública canônica usada para links em e-mails (recuperação de senha, etc).
// Em produção sempre usa o domínio oficial; em dev/preview usa o origin atual.
const PRODUCTION_URL = "https://biancacleto.com.br";

export function getAppUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_URL;
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.app");
  return isLocal ? window.location.origin : PRODUCTION_URL;
}
