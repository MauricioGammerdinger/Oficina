/**
 * Hash de senha (scrypt, com salt aleatório). Só é usado no Node (Server
 * Actions), nunca no proxy.ts/middleware — "node:crypto" não roda em Edge.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

/** Formato salvo no banco: "salt_em_hex:hash_em_hex". */
export async function hashPassword(senha: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivada = (await scrypt(senha, salt, 64)) as Buffer;
  return `${salt}:${derivada.toString("hex")}`;
}

export async function verifyPassword(
  senha: string,
  hashArmazenado: string
): Promise<boolean> {
  const [salt, hashHex] = hashArmazenado.split(":");
  if (!salt || !hashHex) return false;

  const derivada = (await scrypt(senha, salt, 64)) as Buffer;
  const armazenado = Buffer.from(hashHex, "hex");
  if (derivada.length !== armazenado.length) return false;
  return timingSafeEqual(derivada, armazenado);
}

/**
 * Hash "de mentira", usado quando o email não existe — pra tentar logar
 * com email que não existe demorar igual a tentar com senha errada, e
 * ninguém descobrir quais emails têm conta só pelo tempo de resposta.
 */
export const HASH_FALSO = `${"a".repeat(32)}:${"b".repeat(128)}`;
