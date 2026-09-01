import Link from "next/link";
import { sair } from "@/app/actions";
import { AlternarTema } from "@/components/alternar-tema";
import { IconeSair, IconeTrocar } from "@/components/icones-acao";
import { Nav } from "@/components/nav";
import { getPerfis, getShoppingList } from "@/lib/queries";
import { getUsuarioLogado } from "@/lib/sessao";

// Nada aqui pode ser gerado no build: o layout lê o banco a cada acesso.
// Sem isso o deploy quebra quando o banco não está acessível na hora do build.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O contador de alertas fica no menu para ela ver que falta comprar algo
  // sem precisar abrir a tela.
  const [compras, usuario] = await Promise.all([
    getShoppingList(),
    getUsuarioLogado(),
  ]);
  // Só busca a lista de perfis se a conta realmente usa isso — a maioria
  // dos logins (sem ninguém dividindo com outra pessoa) nunca cadastrou
  // nenhum, então evita uma consulta a mais na navegação comum.
  const perfis = usuario ? await getPerfis(usuario.id) : [];
  const mostrarTrocaDePerfil = perfis.length >= 2;

  return (
    // Um "cartão" único e arredondado envolvendo tudo — menu e conteúdo —
    // flutuando sobre o fundo bege. É mais bonito que a barra lateral
    // solta com uma linha reta separando do conteúdo.
    <div className="mx-auto max-w-6xl p-2 sm:p-4 print:p-0">
      <div className="flex overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 print:rounded-none print:border-0 print:bg-white print:shadow-none">
        {/* Barra lateral fixa — só em telas maiores, pra deixar o conteúdo
            mais curto e não precisar rolar tanto pra ver tudo. Escondida
            também na impressão — ninguém quer o menu no papel. */}
        <aside className="sticky top-2 hidden max-h-[calc(100vh-1rem)] w-52 shrink-0 flex-col overflow-y-auto border-r border-neutral-100 px-4 py-5 sm:top-4 sm:flex sm:max-h-[calc(100vh-2rem)] dark:border-neutral-800 print:hidden">
          <p className="mb-4 truncate text-sm font-semibold">
            Controle da Oficina
          </p>
          {/* Botão de claro/escuro logo no topo, bem visível — antes ficava
              lá embaixo como texto pequeno e cinza e ninguém achava. */}
          <AlternarTema />
          {mostrarTrocaDePerfil &&
            (usuario?.profileName ? (
              <div className="mt-2 flex items-center justify-between gap-1 rounded-lg bg-neutral-50 pl-2 dark:bg-neutral-950">
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {usuario.profileName}
                </span>
                <Link href="/quem-e-voce" className="link-acao shrink-0">
                  <IconeTrocar className="h-3.5 w-3.5" />
                  trocar
                </Link>
              </div>
            ) : (
              <Link href="/quem-e-voce" className="link-acao mt-2">
                <IconeTrocar className="h-3.5 w-3.5" />
                Escolher quem é você
              </Link>
            ))}
          <div className="mt-4">
            <Nav
              alertas={compras.length}
              orientation="vertical"
              mostrarAdmin={usuario?.isAdmin ?? false}
            />
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            {usuario && (
              <span className="min-w-0 flex-1 truncate text-xs text-neutral-400">
                {usuario.name}
              </span>
            )}
            <form action={sair}>
              <button className="link-acao shrink-0">
                <IconeSair className="h-3.5 w-3.5" />
                sair
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 pb-16 pt-4 sm:px-6 print:px-0 print:pb-0 print:pt-0">
          {/* No celular a barra lateral não cabe, então o menu vira uma
              faixa horizontal rolável no topo, como já era antes. */}
          <header className="mb-5 flex flex-col gap-3 sm:hidden print:hidden">
            <div className="flex items-center justify-between gap-3">
              <Nav
                alertas={compras.length}
                mostrarAdmin={usuario?.isAdmin ?? false}
              />
              <form action={sair}>
                <button className="link-acao shrink-0">
                  <IconeSair className="h-3.5 w-3.5" />
                  sair
                </button>
              </form>
            </div>
            <div className="flex items-center justify-between gap-2">
              <AlternarTema />
              {mostrarTrocaDePerfil &&
                (usuario?.profileName ? (
                  <div className="flex min-w-0 items-center gap-1 rounded-lg bg-neutral-50 pl-2 dark:bg-neutral-950">
                    <span className="min-w-0 flex-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {usuario.profileName}
                    </span>
                    <Link href="/quem-e-voce" className="link-acao shrink-0">
                      <IconeTrocar className="h-3.5 w-3.5" />
                      trocar
                    </Link>
                  </div>
                ) : (
                  <Link href="/quem-e-voce" className="link-acao">
                    <IconeTrocar className="h-3.5 w-3.5" />
                    Escolher quem é você
                  </Link>
                ))}
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
