import { money, qty } from "@/lib/parse";
import {
  getAtividadePeriodo,
  getComparativoFornecedores,
  getGastoComprasPorMes,
  getPerdaContagens,
  getResumoNegocio,
  getTopConsumo,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export default async function RelatoriosPage() {
  const [resumo, gastoPorMes, topConsumo, perda, fornecedores, atividade] = await Promise.all([
    getResumoNegocio(),
    getGastoComprasPorMes(6),
    getTopConsumo(30, 6),
    getPerdaContagens(),
    getComparativoFornecedores(),
    getAtividadePeriodo(30),
  ]);

  const maiorGasto = Math.max(1, ...gastoPorMes.map((m) => m.total));
  const maiorConsumo = Math.max(1, ...topConsumo.map((c) => c.valor));

  return (
    <main className="space-y-5">
      <h1 className="text-lg font-semibold">Relatórios</h1>

      {/* --- resumo geral --- */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="cartao p-3">
          <p className="rotulo">Carros concluídos</p>
          <p className="text-lg font-semibold tabular-nums">{resumo.carros}</p>
        </div>
        <div className="cartao p-3">
          <p className="rotulo">Faturado</p>
          <p className="text-lg font-semibold tabular-nums">
            {money(resumo.faturado)}
          </p>
        </div>
        <div className="cartao p-3">
          <p className="rotulo">Material gasto</p>
          <p className="text-lg font-semibold tabular-nums">
            {money(resumo.material)}
          </p>
        </div>
        <div className="cartao p-3">
          <p className="rotulo">Margem</p>
          <p className="text-lg font-semibold tabular-nums">
            {money(resumo.margem)}
          </p>
        </div>
      </section>
      <p className="text-xs text-neutral-400">
        Considera só carros marcados como concluídos, desde o começo do
        sistema.
      </p>

      {/* --- compras por mês --- */}
      <section className="cartao p-4">
        <h2 className="text-sm font-semibold">Gasto em compras por mês</h2>
        <div className="mt-3 space-y-2">
          {gastoPorMes.map((m) => (
            <div key={m.mes} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs text-neutral-500">
                {m.rotulo}
              </span>
              <div className="h-4 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-4 rounded-full bg-neutral-800 dark:bg-neutral-200"
                  style={{
                    width: `${Math.max((m.total / maiorGasto) * 100, m.total > 0 ? 3 : 0)}%`,
                  }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                {money(m.total)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* --- comparativo de fornecedores --- */}
      <section className="cartao p-4">
        <h2 className="text-sm font-semibold">Preço por fornecedor</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Compara o preço pago no mesmo insumo quando ele já foi comprado de
          mais de um lugar. Vem do &quot;onde comprou&quot; preenchido na
          entrada de estoque — quanto mais isso for preenchido, mais insumo
          aparece aqui.
        </p>
        {fornecedores.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Nenhum insumo foi comprado de mais de um fornecedor ainda (com
            preço e &quot;onde comprou&quot; preenchidos na entrada).
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {fornecedores.map((p) => {
              const maisBarato = Math.min(
                ...p.fornecedores.map((f) => f.ultimoPreco)
              );
              return (
                <div key={p.productId}>
                  <p className="text-sm font-medium">{p.name}</p>
                  <div className="mt-1 divide-y divide-neutral-100 rounded-xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
                    {p.fornecedores.map((f) => (
                      <div
                        key={f.fornecedor}
                        className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm"
                      >
                        <span className="min-w-0 truncate text-neutral-700 dark:text-neutral-300">
                          {f.fornecedor}
                          <span className="ml-1.5 text-xs text-neutral-400">
                            {f.vezes > 1 ? `· ${f.vezes}x` : ""}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 tabular-nums ${
                            f.ultimoPreco === maisBarato
                              ? "font-semibold text-green-700 dark:text-green-500"
                              : "text-neutral-500"
                          }`}
                        >
                          {money(f.ultimoPreco)}/{p.unit}
                          <span className="ml-1.5 text-xs text-neutral-400">
                            {dataCurta(f.data)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --- top consumo --- */}
      <section className="cartao p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">
            Insumos que mais saíram (últimos 30 dias)
          </h2>
          <span className="text-xs text-neutral-500" title="Carros com material lançado nos últimos 30 dias">
            {atividade.carros} {atividade.carros === 1 ? "carro" : "carros"} no período
          </span>
        </div>
        {topConsumo.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            Nenhuma saída de estoque nos últimos 30 dias.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {topConsumo.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs text-neutral-600 dark:text-neutral-400" title={c.name}>
                  {c.name}
                </span>
                <div className="h-4 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-4 rounded-full bg-neutral-800 dark:bg-neutral-200"
                    style={{ width: `${(c.valor / maiorConsumo) * 100}%` }}
                  />
                </div>
                <span className="w-28 shrink-0 text-right text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                  {qty(c.qty)} {c.unit} · {money(c.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-neutral-400">
          Pra bater o olho se o consumo em lote (ex.: lixa entregue pro time
          sem vincular a um carro) está dentro do esperado: use os{" "}
          {atividade.carros} {atividade.carros === 1 ? "carro" : "carros"} acima
          como referência de escala. Peças feitas no período:{" "}
          <strong className="text-neutral-600 dark:text-neutral-300">
            {atividade.pecasNovas} {atividade.pecasNovas === 1 ? "nova" : "novas"}
          </strong>{" "}
          ·{" "}
          <strong className="text-neutral-600 dark:text-neutral-300">
            {atividade.pecasRecuperadas} {atividade.pecasRecuperadas === 1 ? "recuperada" : "recuperadas"}
          </strong>
          .
        </p>
      </section>

      {/* --- perda por contagem --- */}
      <section className="cartao p-4">
        <h2 className="text-sm font-semibold">Perda encontrada nas contagens</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Diferença a menor entre o que o sistema achava que tinha e o que foi
          contado na prateleira — costuma indicar material usado sem lançar ou
          sumido.
        </p>
        <div className="mt-3 flex gap-6">
          <div>
            <p className="rotulo">Últimos 90 dias</p>
            <p className="text-lg font-semibold tabular-nums">
              {money(perda.ultimos90)}
            </p>
          </div>
          <div>
            <p className="rotulo">Desde sempre</p>
            <p className="text-lg font-semibold tabular-nums">
              {money(perda.total)}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
