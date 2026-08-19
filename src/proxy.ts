import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, safeEqual, sessionToken } from "@/lib/auth";

/**
 * Tudo exige sessão, menos a tela de login, os arquivos estáticos e as rotas
 * de API — estas últimas (hoje só o alerta diário) se autenticam sozinhas
 * com um segredo próprio, porque quem as chama é a tarefa agendada da
 * Vercel, não uma pessoa logada com cookie no navegador.
 * (No Next 16 este arquivo se chama proxy.ts; era o antigo middleware.ts.)
 */
export default async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const expected = await sessionToken();

  if (safeEqual(cookie, expected)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!entrar|api|_next|favicon.ico).*)"],
};
