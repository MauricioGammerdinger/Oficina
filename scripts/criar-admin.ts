/**
 * Cria (ou promove) a primeira conta administradora — precisa disso pra
 * conseguir logar pela primeira vez depois que o login virou email+senha,
 * já que cadastro exige convite e só um admin pode convidar gente.
 *
 * Rode uma vez, apontando pro banco certo (dev ou produção):
 *
 *   ADMIN_EMAIL="voce@exemplo.com" ADMIN_NAME="Seu Nome" ADMIN_SENHA="umasenha123" \
 *     DATABASE_URL="..." npm run db:criar-admin
 *
 * Se o email já existir, só atualiza a senha e marca como admin — pode
 * rodar de novo com segurança se precisar resetar sua própria senha.
 */
import "./carregar-env";
import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/senha";
import { normalizarEmail } from "../src/lib/auth";

async function main() {
  const email = normalizarEmail(process.env.ADMIN_EMAIL ?? "");
  const name = process.env.ADMIN_NAME ?? "";
  const senha = process.env.ADMIN_SENHA ?? "";

  if (!email || !name || senha.length < 6) {
    console.error(
      "Defina ADMIN_EMAIL, ADMIN_NAME e ADMIN_SENHA (mínimo 6 caracteres)."
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(senha);

  const [existente] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existente) {
    await db
      .update(users)
      .set({ passwordHash, name, isAdmin: true, active: true })
      .where(eq(users.id, existente.id));
    console.log(`Conta ${email} já existia — senha atualizada e marcada como admin.`);
  } else {
    await db.insert(users).values({ email, name, passwordHash, isAdmin: true });
    console.log(`Conta admin ${email} criada.`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
