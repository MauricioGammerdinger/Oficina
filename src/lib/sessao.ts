import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { COOKIE_NAME, lerSessao } from "@/lib/auth";

export type UsuarioLogado = {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
  /** Perfil escolhido (Cannabis, Ramon...) — null se a conta não usa perfis
   *  ou se ainda não escolheu (aí a tela de login redireciona pra escolher). */
  profileId: number | null;
  profileName: string | null;
};

/** Quem está logado nessa requisição — ou null se não estiver (não deveria
 * acontecer nas páginas protegidas, já que o proxy.ts barra antes, mas as
 * páginas podem usar isso pra saber o nome/admin de quem entrou). */
export async function getUsuarioLogado(): Promise<UsuarioLogado | null> {
  const jar = await cookies();
  const sessao = await lerSessao(jar.get(COOKIE_NAME)?.value);
  if (sessao === null) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isAdmin: users.isAdmin,
      active: users.active,
    })
    .from(users)
    .where(eq(users.id, sessao.userId));

  if (!user || !user.active) return null;

  let profileName: string | null = null;
  if (sessao.profileId !== null) {
    const [perfil] = await db
      .select({ name: profiles.name })
      .from(profiles)
      .where(eq(profiles.id, sessao.profileId));
    profileName = perfil?.name ?? null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    profileId: profileName ? sessao.profileId : null,
    profileName,
  };
}
