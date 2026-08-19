const COOKIE_NAME = "oficina_sessao";

/**
 * Token de sessão = SHA-256 da senha + segredo. Não dá para voltar do token
 * para a senha, e sem o segredo do servidor ninguém forja um cookie válido.
 * Funciona igual no Node e no runtime de Edge (middleware).
 */
export async function sessionToken() {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret) {
    throw new Error(
      "APP_PASSWORD e AUTH_SECRET precisam estar configuradas no ambiente."
    );
  }
  const data = new TextEncoder().encode(`${password}::${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante, para não vazar o token por timing. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export { COOKIE_NAME };
