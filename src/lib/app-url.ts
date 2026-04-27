// URL pública canônica usada em links enviados por e-mail (recuperação de senha, convites, etc).
// Sempre aponta para o domínio oficial em produção, independente do origin atual.
export const APP_PUBLIC_URL = "https://biancacleto.com.br";

export function getResetPasswordUrl(): string {
  return `${APP_PUBLIC_URL}/reset-password`;
}
