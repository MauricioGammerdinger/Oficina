import { sair } from "@/app/actions";
import { AlternarTema } from "@/components/alternar-tema";
import { Nav } from "@/components/nav";
import { getShoppingList } from "@/lib/queries";

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
  const compras = await getShoppingList();

  return (
    // Um "cartão" único e arredondado envolvendo tudo — menu e conteúdo —
    // flutuando sobre o fundo bege. É mais bonito que a barra lateral
    // solta com uma linha reta separando do conteúdo.
    <div className="mx-auto max-w-6xl p-2 sm:p-4">
      <div className="flex overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {/* Barra lateral fixa — só em telas maiores, pra deixar o conteúdo
            mais curto e não precisar rolar tanto pra ver tudo. */}
        <aside className="sticky top-2 hidden max-h-[calc(100vh-1rem)] w-52 shrink-0 flex-col overflow-y-auto border-r border-neutral-100 px-4 py-5 sm:top-4 sm:flex sm:max-h-[calc(100vh-2rem)] dark:border-neutral-800">
          <p className="mb-4 truncate text-sm font-semibold">
            Controle da Oficina
          </p>
          {/* Botão de claro/escuro logo no topo, bem visível — antes ficava
              lá embaixo como texto pequeno e cinza e ninguém achava. */}
          <AlternarTema />
          <div className="mt-4">
            <Nav alertas={compras.length} orientation="vertical" />
          </div>
          <form action={sair} className="mt-auto pt-4">
            <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200">
              sair
            </button>
          </form>
        </aside>

        <div className="min-w-0 flex-1 px-4 pb-16 pt-4 sm:px-6">
          {/* No celular a barra lateral não cabe, então o menu vira uma
              faixa horizontal rolável no topo, como já era antes. */}
          <header className="mb-5 flex flex-col gap-3 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <Nav alertas={compras.length} />
              <form action={sair}>
                <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200">
                  sair
                </button>
              </form>
            </div>
            <AlternarTema />
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
