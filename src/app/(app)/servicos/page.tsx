import {
  arquivarTipoServico,
  criarTipoServico,
  salvarReceitaItem,
} from "@/app/actions";
import { money } from "@/lib/parse";
import { getProducts, getServiceTypes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  const [tipos, produtos] = await Promise.all([
    getServiceTypes(),
    getProducts(),
  ]);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Tipos de serviço</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Para cada serviço, quanto de cada insumo costuma gastar. É essa receita
          que faz o sistema calcular sozinho o custo de material de cada carro.
          Cadastra uma vez, usa pra sempre.
        </p>
      </div>

      <details className="cartao p-4">
        <summary className="cursor-pointer text-sm font-medium dark:text-neutral-200">
          + Novo tipo de serviço
        </summary>
        <form action={criarTipoServico} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="rotulo">Nome</label>
            <input
              name="name"
              placeholder="Ex.: Recuperação de para-choque"
              className="campo"
              required
            />
          </div>
          <div>
            <label className="rotulo">Observação</label>
            <input name="notes" className="campo" />
          </div>
          <div className="sm:col-span-2">
            <button className="botao">Cadastrar</button>
          </div>
        </form>
      </details>

      {tipos.length === 0 && (
        <div className="cartao p-8 text-center text-sm text-neutral-500">
          Nenhum tipo de serviço cadastrado ainda.
        </div>
      )}

      {tipos.map((tipo) => {
        const jaNaReceita = new Set(tipo.items.map((i) => i.productId));
        const disponiveis = produtos.filter((p) => !jaNaReceita.has(p.id));

        return (
          <section key={tipo.id} className="cartao p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium">
                {tipo.name}
                {tipo.notes && (
                  <span className="ml-2 text-xs font-normal text-neutral-400">
                    {tipo.notes}
                  </span>
                )}
              </h2>
              <span className="text-sm font-semibold tabular-nums">
                {money(tipo.totalCost)}
              </span>
            </div>

            {tipo.items.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                Sem insumos na receita — esse serviço vai contar como custo zero.
              </p>
            ) : (
              <>
                {/* Cabeçalho das colunas — sem isso os números pareciam
                    soltos, sem dizer o que cada um significava. */}
                <div className="mt-3 flex items-center gap-2 px-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  <span className="min-w-0 flex-1">Insumo</span>
                  <span className="w-40 shrink-0">Qtd. na receita</span>
                  <span className="w-20 shrink-0 text-right">Custo</span>
                </div>
                <ul className="divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
                  {tipo.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 py-2">
                      <span className="min-w-0 flex-1 truncate">
                        {item.productName}
                      </span>
                      <form
                        action={salvarReceitaItem}
                        className="flex w-40 shrink-0 items-center gap-1.5"
                      >
                        <input type="hidden" name="serviceTypeId" value={tipo.id} />
                        <input type="hidden" name="productId" value={item.productId} />
                        <input
                          name="qty"
                          inputMode="decimal"
                          defaultValue={item.qty}
                          className="campo min-w-0 flex-1 py-1 text-sm"
                          aria-label={`Quantidade de ${item.productName}`}
                        />
                        <span className="shrink-0 text-xs text-neutral-400">
                          {item.unit}
                        </span>
                        <button
                          className="botao-claro shrink-0 px-2 py-1 text-xs"
                          title="Salvar essa quantidade"
                        >
                          ok
                        </button>
                      </form>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-neutral-400">
                        {money(item.qty * item.cost)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {disponiveis.length > 0 && (
              <form
                action={salvarReceitaItem}
                className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800"
              >
                <input type="hidden" name="serviceTypeId" value={tipo.id} />
                <div className="min-w-40 flex-1">
                  <label className="rotulo">Adicionar insumo</label>
                  <select name="productId" className="campo" required defaultValue="">
                    <option value="" disabled>
                      Escolher...
                    </option>
                    {disponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) · {money(p.cost)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="rotulo">Quantidade</label>
                  <input
                    name="qty"
                    inputMode="decimal"
                    placeholder="0"
                    className="campo"
                    required
                  />
                </div>
                <button className="botao">Adicionar</button>
              </form>
            )}

            <form action={arquivarTipoServico} className="mt-3">
              <input type="hidden" name="id" value={tipo.id} />
              <button className="text-xs text-neutral-400 hover:text-red-600">
                arquivar serviço
              </button>
            </form>
          </section>
        );
      })}

      <p className="text-xs text-neutral-400">
        Para tirar um insumo da receita, coloque a quantidade 0 e clique em ok.
      </p>
    </main>
  );
}
