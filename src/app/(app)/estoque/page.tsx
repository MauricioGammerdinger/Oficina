import { criarProduto } from "@/app/actions";
import { LinhaEstoque } from "@/components/linha-estoque";
import { qty as fmtQty } from "@/lib/parse";
import { getProducts, getRecentMoves, getVehicles } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const busca = (q ?? "").trim().toLowerCase();

  const [todos, veiculos, movimentos] = await Promise.all([
    getProducts(),
    getVehicles(),
    getRecentMoves(25),
  ]);

  const produtos = busca
    ? todos.filter(
        (p) =>
          p.name.toLowerCase().includes(busca) ||
          (p.category ?? "").toLowerCase().includes(busca)
      )
    : todos;

  const abaixoDoMinimo = todos.filter((p) => p.balance <= p.minStock).length;

  const carrosAbertos = veiculos
    .filter((v) => v.status !== "concluido")
    .map((v) => ({ id: v.id, model: v.model, plate: v.plate }));

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Estoque</h1>
        <p className="text-sm text-neutral-500">
          {todos.length} insumos ·{" "}
          {abaixoDoMinimo > 0 ? (
            <span className="font-medium text-amber-600">
              {abaixoDoMinimo} para comprar
            </span>
          ) : (
            "tudo acima do mínimo"
          )}
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar insumo..."
          className="campo"
          aria-label="Buscar insumo"
        />
        <button className="botao-claro">Buscar</button>
      </form>

      <details className="cartao p-4">
        <summary className="cursor-pointer text-sm font-medium text-neutral-800 marker:content-none hover:text-black">
          + Cadastrar insumo
        </summary>
        <form action={criarProduto} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="rotulo">Nome</label>
            <input
              name="name"
              placeholder="Ex.: Massa poliéster 900g"
              className="campo"
              required
            />
          </div>
          <div>
            <label className="rotulo">Unidade</label>
            <input name="unit" placeholder="un, L, kg, m" defaultValue="un" className="campo" />
          </div>
          <div>
            <label className="rotulo">Categoria</label>
            <input name="category" placeholder="Tinta, massa, lixa..." className="campo" />
          </div>
          <div>
            <label className="rotulo">Preço unitário</label>
            <input name="cost" inputMode="decimal" placeholder="0,00" className="campo" />
          </div>
          <div>
            <label className="rotulo">Estoque mínimo</label>
            <input name="minStock" inputMode="decimal" placeholder="0" className="campo" />
          </div>
          <div>
            <label className="rotulo">Quanto tem hoje</label>
            <input name="initial" inputMode="decimal" placeholder="0" className="campo" />
          </div>
          <div className="flex items-end">
            <button className="botao w-full">Cadastrar</button>
          </div>
        </form>
      </details>

      <section className="cartao overflow-hidden">
        {produtos.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-neutral-500">
            {busca
              ? "Nenhum insumo com esse nome."
              : "Nenhum insumo cadastrado ainda. Use o \"Cadastrar insumo\" acima."}
          </p>
        ) : (
          produtos.map((produto) => (
            <LinhaEstoque
              key={produto.id}
              produto={produto}
              veiculos={carrosAbertos}
            />
          ))
        )}
      </section>


      <details className="cartao p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Últimas movimentações
        </summary>
        <ul className="mt-3 divide-y divide-neutral-100 text-sm">
          {movimentos.length === 0 && (
            <li className="py-2 text-neutral-500">Nada lançado ainda.</li>
          )}
          {movimentos.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <span
                className={`w-16 shrink-0 text-xs font-semibold uppercase ${
                  m.kind === "in"
                    ? "text-emerald-600"
                    : m.kind === "out"
                      ? "text-neutral-500"
                      : "text-blue-600"
                }`}
              >
                {m.kind === "in" ? "entrada" : m.kind === "out" ? "saída" : "ajuste"}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {m.productName}
                {m.vehicleModel && (
                  <span className="text-neutral-400">
                    {" "}
                    · {m.vehicleModel}
                    {m.vehiclePlate ? ` (${m.vehiclePlate})` : ""}
                  </span>
                )}
                {m.note && (
                  <span className="text-neutral-400"> · {m.note}</span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-neutral-600">
                {m.kind === "out" ? "−" : m.qty < 0 ? "" : "+"}
                {fmtQty(Math.abs(m.qty))} {m.unit}
              </span>
              <span className="hidden w-20 shrink-0 text-right text-xs text-neutral-400 sm:block">
                {new Date(m.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
