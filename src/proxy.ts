import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, lerSessao } from "@/lib/auth";

/**
 * Tudo exige sessão, menos as telas de login/cadastro e os arquivos
 * estáticos. Só confere a assinatura do cookie aqui — não bate no banco
 * (o middleware roda em Edge, sem acesso ao Postgres). Quem está logado
 * de verdade (nome, admin ou não) é resolvido depois, dentro da página.
 * (No Next 16 este arquivo se chama proxy.ts; era o antigo middleware.ts.)
 */
export default async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const userId = await lerSessao(cookie);

  if (userId !== null) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!entrar|cadastrar|_next|favicon.ico).*)"],
};
