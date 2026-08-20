import { movimentar } from "@/app/actions";
import { money, qty as fmtQty } from "@/lib/parse";
import { getShoppingList } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ComprarPage() {
  const lista = await getShoppingList();
  const total = lista.reduce((soma, item) => soma + item.estimated, 0);

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Comprar</h1>
        {lista.length > 0 && (
          <p className="text-sm text-neutral-500">
            {lista.length} {lista.length === 1 ? "item" : "itens"} ·{" "}
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{money(total)}</span>{" "}
            estimado
          </p>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="cartao p-8 text-center">
          <p className="text-sm font-medium">Nada para comprar.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Todos os insumos estão acima do estoque mínimo.
          </p>
        </div>
      ) : (
        <section className="cartao divide-y divide-neutral-100 dark:divide-neutral-800">
          {lista.map((item) => (
            <div key={item.id} className="p-3">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    item.zeroed ? "bg-red-600" : "bg-amber-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-neutral-500">
                    {item.zeroed ? (
                      <span className="font-semibold text-red-600">Acabou</span>
                    ) : (
                      <>
                        Tem {fmtQty(item.balance)} {item.unit}
                      </>
                    )}{" "}
                    · mínimo {fmtQty(item.minStock)} {item.unit}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    comprar {fmtQty(item.suggested)} {item.unit}
                  </p>
                  <p className="text-xs text-neutral-400 tabular-nums">
                    ≈ {money(item.estimated)}
                  </p>
                </div>
              </div>

              {/* Comprou? Lança a entrada aqui mesmo, sem sair da tela.
                  Cada campo tem um rótulo visível — antes eram só números
                  soltos (ex.: "1" e "78") e não dava pra saber qual era a
                  quantidade e qual era o preço sem já conhecer a tela. */}
              <form
                action={movimentar}
                className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end"
              >
                <input type="hidden" name="productId" value={item.id} />
                <input type="hidden" name="kind" value="in" />
                <div>
                  <label className="rotulo" htmlFor={`qty-${item.id}`}>
                    Quantidade
                  </label>
                  <input
                    id={`qty-${item.id}`}
                    name="qty"
                    inputMode="decimal"
                    defaultValue={item.suggested || ""}
                    className="campo"
                    required
                  />
                </div>
                <div>
                  <label className="rotulo" htmlFor={`cost-${item.id}`}>
                    Preço unit.
                  </label>
                  <input
                    id={`cost-${item.id}`}
                    name="unitCost"
                    inputMode="decimal"
                    defaultValue={item.cost || ""}
                    className="campo"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="rotulo" htmlFor={`note-${item.id}`}>
                    Fornecedor
                  </label>
                  <input
                    id={`note-${item.id}`}
                    name="note"
                    placeholder="Opcional"
                    className="campo"
                  />
                </div>
                <button className="botao col-span-2 sm:col-span-1">
                  Comprei
                </button>
              </form>
            </div>
          ))}
        </section>
      )}

      <p className="text-xs text-neutral-400">
        A sugestão de quantidade repõe até o dobro do estoque mínimo, para não
        precisar comprar o mesmo item na semana seguinte.
      </p>
    </main>
  );
}
