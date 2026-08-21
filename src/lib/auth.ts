/**
 * Sessão de login: um cookie assinado (userId + validade + assinatura),
 * sem precisar guardar nada em tabela — verificar é só conferir a
 * assinatura de novo com o segredo do servidor. Usa Web Crypto
 * (crypto.subtle), que funciona igual no Node e no runtime de Edge
 * (o middleware do Next roda em Edge, sem acesso a "node:crypto" nem ao
 * banco — por isso a checagem de sessão não pode depender de consulta).
 */

const COOKIE_NAME = "oficina_sessao";
const VALIDADE_MS = 1000 * 60 * 60 * 24 * 90; // 90 dias

async function hmac(dado: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET precisa estar configurada.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinatura = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(dado)
  );
  return Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante, para não vazar a assinatura por timing. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Cria o valor do cookie de sessão pra um usuário que acabou de logar. */
export async function criarSessao(userId: number): Promise<string> {
  const validade = Date.now() + VALIDADE_MS;
  const payload = `${userId}.${validade}`;
  const assinatura = await hmac(payload);
  return `${payload}.${assinatura}`;
}

/**
 * Confere o cookie de sessão e devolve o id do usuário — ou null se o
 * cookie não existe, expirou, ou foi adulterado (assinatura não bate).
 */
export async function lerSessao(
  cookie: string | undefined
): Promise<number | null> {
  if (!cookie) return null;
  const partes = cookie.split(".");
  if (partes.length !== 3) return null;
  const [userIdStr, validadeStr, assinatura] = partes;

  const esperada = await hmac(`${userIdStr}.${validadeStr}`);
  if (!safeEqual(assinatura, esperada)) return null;

  const validade = Number(validadeStr);
  if (!Number.isFinite(validade) || Date.now() > validade) return null;

  const userId = Number(userIdStr);
  return Number.isInteger(userId) ? userId : null;
}

/** Deixa o email sempre no mesmo formato, pra "Fulano@X.com" e "fulano@x.com" serem o mesmo login. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export { COOKIE_NAME, VALIDADE_MS };
