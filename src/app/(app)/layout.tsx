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
    <div className="mx-auto flex max-w-6xl">
      {/* Barra lateral fixa — só em telas maiores, pra deixar o conteúdo
          mais curto e não precisar rolar tanto pra ver tudo. */}
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-neutral-200 px-4 py-5 sm:flex dark:border-neutral-800">
        <p className="mb-6 truncate text-sm font-semibold">
          Controle da Oficina
        </p>
        <Nav alertas={compras.length} orientation="vertical" />
        <div className="mt-auto flex items-center gap-3 pt-4">
          <AlternarTema />
          <form action={sair}>
            <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200">
              sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6">
        {/* No celular a barra lateral não cabe, então o menu vira uma
            faixa horizontal rolável no topo, como já era antes. */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:hidden">
          <Nav alertas={compras.length} />
          <div className="flex items-center gap-3">
            <AlternarTema />
            <form action={sair}>
              <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200">
                sair
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
