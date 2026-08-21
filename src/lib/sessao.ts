import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { COOKIE_NAME, lerSessao } from "@/lib/auth";

export type UsuarioLogado = {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
};

/** Quem está logado nessa requisição — ou null se não estiver (não deveria
 * acontecer nas páginas protegidas, já que o proxy.ts barra antes, mas as
 * páginas podem usar isso pra saber o nome/admin de quem entrou). */
export async function getUsuarioLogado(): Promise<UsuarioLogado | null> {
  const jar = await cookies();
  const userId = await lerSessao(jar.get(COOKIE_NAME)?.value);
  if (userId === null) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isAdmin: users.isAdmin,
      active: users.active,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin };
}
