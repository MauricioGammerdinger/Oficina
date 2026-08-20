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
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
  );
}
