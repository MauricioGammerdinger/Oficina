import { money, qty } from "@/lib/parse";
import {
  getGastoComprasPorMes,
  getPerdaContagens,
  getResumoNegocio,
  getTopConsumo,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const [resumo, gastoPorMes, topConsumo, perda] = await Promise.all([
    getResumoNegocio(),
    getGastoComprasPorMes(6),
    getTopConsumo(30, 6),
    getPerdaContagens(),
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
              <div className="h-4 flex-1 rounded bg-neutral-100">
                <div
                  className="h-4 rounded bg-neutral-800"
                  style={{
                    width: `${Math.max((m.total / maiorGasto) * 100, m.total > 0 ? 3 : 0)}%`,
                  }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-neutral-600">
                {money(m.total)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* --- top consumo --- */}
      <section className="cartao p-4">
        <h2 className="text-sm font-semibold">
          Insumos que mais saíram (últimos 30 dias)
        </h2>
        {topConsumo.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            Nenhuma saída de estoque nos últimos 30 dias.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {topConsumo.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs text-neutral-600" title={c.name}>
                  {c.name}
                </span>
                <div className="h-4 flex-1 rounded bg-neutral-100">
                  <div
                    className="h-4 rounded bg-neutral-800"
                    style={{ width: `${(c.valor / maiorConsumo) * 100}%` }}
                  />
                </div>
                <span className="w-28 shrink-0 text-right text-xs tabular-nums text-neutral-600">
                  {qty(c.qty)} {c.unit} · {money(c.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
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
