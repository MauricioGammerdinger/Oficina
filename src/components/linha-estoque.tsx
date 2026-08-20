import { arquivarProduto, editarProduto, movimentar } from "@/app/actions";
import { money, qty as fmtQty } from "@/lib/parse";
import type { ProductRow } from "@/lib/queries";

type Veiculo = { id: number; model: string; plate: string | null };

/**
 * Uma linha do estoque. Usa <details> nativo: abre e fecha sem JavaScript,
 * então a página carrega rápido até num celular ruim.
 */
export function LinhaEstoque({
  produto,
  veiculos,
}: {
  produto: ProductRow;
  veiculos: Veiculo[];
}) {
  const zerado = produto.balance <= 0;
  const abaixo = produto.balance <= produto.minStock;

  return (
    <details className="group border-b border-neutral-200 last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-neutral-50">
        {abaixo ? (
          <span
            title={zerado ? "Acabou" : "Abaixo do mínimo"}
            className={`shrink-0 text-sm ${
              zerado ? "text-red-600" : "text-amber-500"
            }`}
          >
            ⚠
          </span>
        ) : (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full bg-neutral-200"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {produto.name}
          </span>
          {produto.category && (
            <span className="block truncate text-xs text-neutral-400">
              {produto.category}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span
            className={`block text-sm font-semibold tabular-nums ${
              zerado ? "text-red-600" : abaixo ? "text-amber-600" : ""
            }`}
          >
            {fmtQty(produto.balance)} {produto.unit}
          </span>
          <span className="block text-xs text-neutral-400 tabular-nums">
            mín {fmtQty(produto.minStock)} · {money(produto.cost)}
          </span>
        </span>
        <span className="shrink-0 text-neutral-300 transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="space-y-4 border-t border-neutral-100 bg-neutral-50 px-3 py-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Entrada */}
          <form action={movimentar} className="cartao space-y-2 p-3">
            <input type="hidden" name="productId" value={produto.id} />
            <input type="hidden" name="kind" value="in" />
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Entrada — comprei
            </p>
            <div className="flex gap-2">
              <input
                name="qty"
                inputMode="decimal"
                placeholder={`Qtd (${produto.unit})`}
                className="campo"
                required
              />
              <input
                name="unitCost"
                inputMode="decimal"
                placeholder="Preço un."
                className="campo"
                title="Se preencher, atualiza o preço de referência do insumo"
              />
            </div>
            <input name="note" placeholder="Onde comprou (opcional)" className="campo" />
            <button className="botao w-full">Lançar entrada</button>
          </form>

          {/* Saída */}
          <form action={movimentar} className="cartao space-y-2 p-3">
            <input type="hidden" name="productId" value={produto.id} />
            <input type="hidden" name="kind" value="out" />
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Saída — usei
            </p>
            <input
              name="qty"
              inputMode="decimal"
              placeholder={`Qtd (${produto.unit})`}
              className="campo"
              required
            />
            <input
              name="note"
              placeholder="Quem pegou (opcional)"
              className="campo"
            />
            <select name="vehicleId" className="campo" defaultValue="">
              <option value="">Sem carro específico</option>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.model}
                  {v.plate ? ` · ${v.plate}` : ""}
                </option>
              ))}
            </select>
            <button className="botao-claro w-full">Lançar saída</button>
          </form>
        </div>

        {/* Editar cadastro */}
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800">
            editar cadastro
          </summary>
          <form
            action={editarProduto}
            className="mt-2 grid gap-2 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={produto.id} />
            <div className="sm:col-span-2">
              <label className="rotulo">Nome</label>
              <input name="name" defaultValue={produto.name} className="campo" required />
            </div>
            <div>
              <label className="rotulo">Unidade</label>
              <input name="unit" defaultValue={produto.unit} className="campo" />
            </div>
            <div>
              <label className="rotulo">Categoria</label>
              <input
                name="category"
                defaultValue={produto.category ?? ""}
                className="campo"
              />
            </div>
            <div>
              <label className="rotulo">Preço unitário</label>
              <input
                name="cost"
                inputMode="decimal"
                defaultValue={produto.cost}
                className="campo"
              />
            </div>
            <div>
              <label className="rotulo">Estoque mínimo</label>
              <input
                name="minStock"
                inputMode="decimal"
                defaultValue={produto.minStock}
                className="campo"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button className="botao">Salvar</button>
            </div>
          </form>

          <form action={arquivarProduto} className="mt-2">
            <input type="hidden" name="id" value={produto.id} />
            <button className="text-xs text-neutral-400 hover:text-red-600">
              arquivar insumo
            </button>
          </form>
        </details>
      </div>
    </details>
  );
}
