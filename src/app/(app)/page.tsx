import Link from "next/link";

import { IconeSeta } from "@/components/icones-acao";
import { money, qty as fmtQty } from "@/lib/parse";
import { getResumoNegocio, getShoppingList, getVehicles } from "@/lib/queries";

export const dynamic = "force-dynamic";

const rotuloStatus: Record<string, string> = {
  previsto: "Previsto",
  andamento: "Em andamento",
};

export default async function InicioPage() {
  const [resumo, compras, carros] = await Promise.all([
    getResumoNegocio(),
    getShoppingList(),
    getVehicles(),
  ]);

  const emAberto = carros.filter((c) => c.status !== "concluido").slice(0, 5);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Início</h1>
        <p className="mt-1 text-sm text-neutral-500">
          O que precisa de atenção agora, e como o negócio está indo.
        </p>
      </div>

      {/* --- dia a dia --- */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="cartao p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Carros em aberto</h2>
            <Link href="/carros" className="link-nav">
              ver todos
              <IconeSeta className="h-3.5 w-3.5" />
            </Link>
          </div>

          {emAberto.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              Nenhum carro em aberto agora.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
              {emAberto.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/carros/${c.id}`}
                    className="flex items-center gap-2 py-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {c.model}
                      {c.plate && (
                        <span className="ml-1.5 text-xs font-normal text-neutral-400">
                          {c.plate}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {rotuloStatus[c.status] ?? c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cartao p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">
              Para comprar
              {compras.length > 0 && (
                <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {compras.length}
                </span>
              )}
            </h2>
            <Link href="/comprar" className="link-nav">
              ver tudo
              <IconeSeta className="h-3.5 w-3.5" />
            </Link>
          </div>

          {compras.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              Nada abaixo do estoque mínimo.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
              {compras.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center gap-2 py-2">
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      item.zeroed ? "bg-red-600" : "bg-amber-500"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-400">
                    {item.zeroed ? "acabou" : `${fmtQty(item.balance)} ${item.unit}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* --- resumo do negócio --- */}
      <section className="cartao p-4">
        <h2 className="text-sm font-medium">Resumo do negócio</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="rotulo">Carros concluídos</p>
            <p className="text-lg font-semibold tabular-nums">{resumo.carros}</p>
          </div>
          <div>
            <p className="rotulo">Faturado</p>
            <p className="text-lg font-semibold tabular-nums">
              {money(resumo.faturado)}
            </p>
          </div>
          <div>
            <p className="rotulo">Material gasto</p>
            <p className="text-lg font-semibold tabular-nums">
              {money(resumo.material)}
            </p>
          </div>
          <div>
            <p className="rotulo">Margem</p>
            <p className="text-lg font-semibold tabular-nums">
              {money(resumo.margem)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Considera só carros marcados como concluídos, desde o começo do
          sistema.{" "}
          <Link href="/relatorios" className="underline hover:text-neutral-600 dark:hover:text-neutral-300">
            Ver relatórios completos
          </Link>
        </p>
      </section>
    </main>
  );
}
