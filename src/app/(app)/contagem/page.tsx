import {
  abrirContagem,
  excluirContagem,
  fecharContagem,
  salvarContagem,
} from "@/app/actions";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { money, qty as fmtQty } from "@/lib/parse";
import { getCountHistory, getOpenCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ContagemPage() {
  const [aberta, historico] = await Promise.all([
    getOpenCount(),
    getCountHistory(),
  ]);

  return (
    <main className="space-y-5">
      <div className="print:hidden">
        <h1 className="text-lg font-semibold">Contagem</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Conte o que tem de verdade na prateleira. Ao fechar, o sistema acerta o
          saldo e mostra o quanto tinha sumido. Sem isso, o alerta de compra vai
          mentir depois de alguns meses.
        </p>
      </div>

      {!aberta ? (
        <form action={abrirContagem} className="cartao p-6 text-center">
          <p className="text-sm text-neutral-600">
            Nenhuma contagem aberta agora.
          </p>
          <button className="botao mt-3">Começar uma contagem</button>
        </form>
      ) : (
        <form action={fecharContagem} className="space-y-3">
          <input type="hidden" name="countId" value={aberta.id} />

          {/* Pra levar numa folha física e contar na prateleira sem
              precisar ficar com o celular na mão. */}
          <div className="print:hidden">
            <BotaoImprimir>🖨 Imprimir lista</BotaoImprimir>
          </div>

          <p className="hidden text-base font-semibold print:block">
            Contagem —{" "}
            {new Date().toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>

          <div className="cartao overflow-hidden print:rounded-none print:border-0">
            <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
              <span className="min-w-0 flex-1">Insumo</span>
              <span className="w-20 text-right">Sistema</span>
              <span className="w-24 text-right">Contado</span>
            </div>

            {aberta.lines.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-neutral-500">
                Cadastre insumos no estoque primeiro.
              </p>
            )}

            {aberta.lines.map((linha) => {
              const diferenca =
                linha.countedQty === null
                  ? null
                  : linha.countedQty - linha.balance;

              return (
                <div
                  key={linha.id}
                  className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2 last:border-0 dark:border-neutral-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{linha.name}</span>
                    {diferenca !== null && Math.abs(diferenca) >= 0.001 && (
                      <span
                        className={`block text-xs tabular-nums ${
                          diferenca < 0 ? "text-red-600" : "text-blue-600"
                        }`}
                      >
                        {diferenca > 0 ? "+" : "−"}
                        {fmtQty(Math.abs(diferenca))} {linha.unit} ·{" "}
                        {money(Math.abs(diferenca) * linha.cost)}
                      </span>
                    )}
                  </span>
                  <span className="w-20 shrink-0 text-right text-sm tabular-nums text-neutral-500">
                    {fmtQty(linha.balance)}
                  </span>
                  <input
                    name={`qty_${linha.id}`}
                    inputMode="decimal"
                    defaultValue={
                      linha.countedQty === null ? "" : linha.countedQty
                    }
                    placeholder="—"
                    aria-label={`Quantidade contada de ${linha.name}`}
                    className="campo w-24 shrink-0 py-1 text-right"
                  />
                </div>
              );
            })}
          </div>

          <div className="print:hidden">
            <label className="rotulo">Observação da contagem</label>
            <input
              name="note"
              placeholder="Ex.: contagem de setembro"
              className="campo"
            />
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <button formAction={salvarContagem} className="botao-claro">
              Salvar sem fechar
            </button>
            <button className="botao">Fechar e ajustar o estoque</button>
          </div>
          <p className="text-xs text-neutral-400 print:hidden">
            Campo em branco = não contei esse item ainda, e o saldo dele não é
            alterado. Só o que estiver preenchido gera ajuste.
          </p>
        </form>
      )}

      {aberta && (
        <form action={excluirContagem} className="print:hidden">
          <input type="hidden" name="id" value={aberta.id} />
          <button className="text-xs text-neutral-400 hover:text-red-600">
            cancelar essa contagem
          </button>
        </form>
      )}

      {historico.length > 0 && (
        <section className="cartao p-4 print:hidden">
          <h2 className="text-sm font-medium">Contagens anteriores</h2>
          <ul className="mt-3 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
            {historico.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <span className="w-20 shrink-0 text-neutral-500">
                  {new Date(c.closedAt).toLocaleDateString("pt-BR")}
                </span>
                <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-400">
                  {c.note ?? `Contagem #${c.id}`} · {c.linesCounted} itens
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  {money(c.diffValue)} de diferença
                </span>
                <form action={excluirContagem}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="shrink-0 text-xs text-neutral-400 hover:text-red-600">
                    apagar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
