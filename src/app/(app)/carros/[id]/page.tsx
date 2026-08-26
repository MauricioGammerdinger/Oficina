import Link from "next/link";
import { notFound } from "next/navigation";

import {
  adicionarPeca,
  alternarServico,
  atualizarVeiculo,
  baixarPrevistos,
  definirStatusVeiculo,
  excluirVeiculo,
  removerPeca,
} from "@/app/actions";
import { money, qty as fmtQty } from "@/lib/parse";
import {
  getServiceTypes,
  getVehicle,
  getVehicleMoves,
  getVehicleParts,
  getVehiclePlannedItems,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const statusOpcoes = [
  { valor: "previsto", rotulo: "Previsto" },
  { valor: "andamento", rotulo: "Em andamento" },
  { valor: "concluido", rotulo: "Concluído" },
];

const rotuloOrigem: Record<string, string> = {
  genuina: "genuína",
  paralela: "paralela",
  usada: "usada",
};

export default async function CarroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carroId = Number(id);
  if (!Number.isInteger(carroId)) notFound();

  const [carro, tipos, previstos, movimentos, pecas] = await Promise.all([
    getVehicle(carroId),
    getServiceTypes(),
    getVehiclePlannedItems(carroId),
    getVehicleMoves(carroId),
    getVehicleParts(carroId),
  ]);
  if (!carro) notFound();

  const marcados = new Set(carro.services.map((s) => s.id));

  const custoPrevisto = carro.estimatedCost;
  const custoReal = carro.actualCost;
  const custoUsado =
    carro.status === "concluido" && custoReal > 0 ? custoReal : custoPrevisto;
  const pecasTotal = carro.partsCost;
  const margem = carro.price - custoUsado - pecasTotal;
  const percentual = carro.price > 0 ? (margem / carro.price) * 100 : null;

  return (
    <main className="space-y-5">
      <div>
        <Link href="/carros" className="text-xs text-neutral-500 hover:underline">
          ← Carros
        </Link>
        <h1 className="mt-1 text-lg font-semibold">
          {carro.model}
          {carro.plate && (
            <span className="ml-2 text-base font-normal text-neutral-400">
              {carro.plate}
            </span>
          )}
        </h1>
        {(carro.customer || carro.customerPhone) && (
          <p className="mt-0.5 text-sm text-neutral-500">
            {carro.customer || "Cliente sem nome"}
            {carro.customerPhone && ` · ${carro.customerPhone}`}
          </p>
        )}
      </div>

      {/* Resumo da conta: é isso que responde "compensa fazer?" */}
      <section className="cartao grid grid-cols-2 divide-x divide-y divide-neutral-100 sm:grid-cols-4 sm:divide-y-0 dark:divide-neutral-800">
        <div className="p-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Cobrado
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {money(carro.price)}
          </p>
        </div>
        <div className="p-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Material
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {money(custoUsado)}
          </p>
          {custoReal > 0 && (
            <p className="text-xs text-neutral-400 tabular-nums">
              previsto {money(custoPrevisto)} · real {money(custoReal)}
            </p>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Peças
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {money(pecasTotal)}
          </p>
          {pecas.length > 0 && (
            <p className="text-xs text-neutral-400 tabular-nums">
              {pecas.length} {pecas.length === 1 ? "item" : "itens"}
            </p>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Sobra
          </p>
          <p
            className={`mt-0.5 text-lg font-semibold tabular-nums ${
              margem < 0 ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {money(margem)}
          </p>
          {percentual !== null && (
            <p className="text-xs text-neutral-400 tabular-nums">
              {percentual.toFixed(0)}% do valor
            </p>
          )}
        </div>
      </section>

      {/* Status */}
      <section className="flex flex-wrap items-center gap-2">
        {statusOpcoes.map((opcao) => (
          <form key={opcao.valor} action={definirStatusVeiculo}>
            <input type="hidden" name="id" value={carro.id} />
            <input type="hidden" name="status" value={opcao.valor} />
            <button
              className={
                carro.status === opcao.valor ? "botao" : "botao-claro"
              }
            >
              {opcao.rotulo}
            </button>
          </form>
        ))}
      </section>

      {/* Checklist */}
      <section className="cartao p-4">
        <h2 className="text-sm font-medium">O que vai fazer nesse carro</h2>
        {tipos.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            Nenhum tipo de serviço cadastrado.{" "}
            <Link href="/servicos" className="underline">
              Cadastrar serviços
            </Link>
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {tipos.map((tipo) => {
              const ativo = marcados.has(tipo.id);
              return (
                <form key={tipo.id} action={alternarServico}>
                  <input type="hidden" name="vehicleId" value={carro.id} />
                  <input type="hidden" name="serviceTypeId" value={tipo.id} />
                  <button
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition ${
                      ativo
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                        : "border-neutral-300 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                        ativo
                          ? "border-white bg-white text-neutral-900 dark:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                          : "border-neutral-400 dark:border-neutral-600"
                      }`}
                    >
                      {ativo ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{tipo.name}</span>
                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        ativo ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400"
                      }`}
                    >
                      {money(tipo.totalCost)}
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>

      {/* Material previsto */}
      <section className="cartao p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Material previsto</h2>
          {previstos.length > 0 && (
            <span className="text-xs text-neutral-500">
              {previstos.length} insumos · {money(custoPrevisto)}
            </span>
          )}
        </div>

        {previstos.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            Marque os serviços acima para ver o material previsto. A quantidade
            de cada insumo vem da receita cadastrada em Serviços.
          </p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
              {previstos.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 tabular-nums text-neutral-600 dark:text-neutral-400">
                    {fmtQty(item.qty)} {item.unit}
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums text-neutral-400">
                    {money(item.qty * item.cost)}
                  </span>
                </li>
              ))}
            </ul>

            <form action={baixarPrevistos} className="mt-3">
              <input type="hidden" name="vehicleId" value={carro.id} />
              <button className="botao-claro w-full sm:w-auto">
                Dar baixa desse material no estoque
              </button>
            </form>
            <p className="mt-1.5 text-xs text-neutral-400">
              Lança tudo de uma vez como saída ligada a esse carro. Se gastou
              diferente, ajuste depois na tela de Estoque — ou na Contagem.
            </p>
          </>
        )}
      </section>

      {/* Material que realmente saiu */}
      {movimentos.length > 0 && (
        <section className="cartao p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Material lançado nesse carro</h2>
            <span className="text-xs text-neutral-500">{money(custoReal)}</span>
          </div>
          <ul className="mt-3 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
            {movimentos.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate">
                  {m.productName}
                  {m.note && (
                    <span className="text-neutral-400"> · {m.note}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-600 dark:text-neutral-400">
                  {fmtQty(m.qty)} {m.unit}
                </span>
                <span className="w-20 shrink-0 text-right tabular-nums text-neutral-400">
                  {money(m.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Peças e itens avulsos — comprados à parte, fora do estoque de insumos */}
      <section className="cartao p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Peças e itens avulsos</h2>
          {pecas.length > 0 && (
            <span className="text-xs text-neutral-500">
              {pecas.length} {pecas.length === 1 ? "item" : "itens"} · {money(pecasTotal)}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Para-choque, farol, removedor de tinta, calafetagem, colagem de
          parabrisa etc. — não sai do estoque de insumos, só entra na conta
          desse carro.
        </p>

        {pecas.length > 0 && (
          <ul className="mt-3 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
            {pecas.map((peca) => (
              <li key={peca.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate">
                  {peca.name}
                  <span className="ml-1.5 text-xs text-neutral-400">
                    {peca.condition === "recuperada" ? "recuperada" : "nova"}
                    {peca.origin && ` · ${rotuloOrigem[peca.origin] ?? peca.origin}`}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs tabular-nums text-neutral-400">
                  {peca.estimatedValue !== null && (
                    <span>orçado {money(peca.estimatedValue)}</span>
                  )}
                  {peca.estimatedValue !== null && peca.paidValue !== null && " · "}
                  {peca.paidValue !== null && (
                    <span className="text-neutral-600 dark:text-neutral-300">
                      pago {money(peca.paidValue)}
                    </span>
                  )}
                  {peca.estimatedValue === null && peca.paidValue === null && "—"}
                </span>
                <form action={removerPeca}>
                  <input type="hidden" name="id" value={peca.id} />
                  <input type="hidden" name="vehicleId" value={carro.id} />
                  <button
                    className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
                    title="Remover"
                  >
                    remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={adicionarPeca}
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto]"
        >
          <input type="hidden" name="vehicleId" value={carro.id} />
          <input
            name="name"
            placeholder="Nome (ex.: Para-choque dianteiro)"
            className="campo"
            required
          />
          <input
            name="estimatedValue"
            inputMode="decimal"
            placeholder="Orçado"
            className="campo sm:w-28"
          />
          <input
            name="paidValue"
            inputMode="decimal"
            placeholder="Pago"
            className="campo sm:w-28"
          />
          <select name="condition" className="campo sm:w-32" defaultValue="nova">
            <option value="nova">Nova</option>
            <option value="recuperada">Recuperada</option>
          </select>
          <select name="origin" className="campo sm:w-36" defaultValue="">
            <option value="">Tipo (opcional)</option>
            <option value="genuina">Genuína</option>
            <option value="paralela">Paralela</option>
            <option value="usada">Usada</option>
          </select>
          <button className="botao-claro">Adicionar</button>
        </form>
      </section>

      {/* Cadastro */}
      <details className="cartao p-4">
        <summary className="cursor-pointer text-sm font-medium dark:text-neutral-200">
          Editar dados do carro
        </summary>
        <form
          action={atualizarVeiculo}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={carro.id} />
          <div>
            <label className="rotulo">Modelo</label>
            <input name="model" defaultValue={carro.model} className="campo" required />
          </div>
          <div>
            <label className="rotulo">Placa</label>
            <input name="plate" defaultValue={carro.plate ?? ""} className="campo" />
          </div>
          <div>
            <label className="rotulo">Cliente</label>
            <input
              name="customer"
              defaultValue={carro.customer ?? ""}
              className="campo"
            />
          </div>
          <div>
            <label className="rotulo">Telefone do cliente</label>
            <input
              name="customerPhone"
              type="tel"
              defaultValue={carro.customerPhone ?? ""}
              placeholder="Ex.: (11) 91234-5678"
              className="campo"
            />
          </div>
          <div>
            <label className="rotulo">Data de entrada</label>
            <input
              name="entryDate"
              type="date"
              defaultValue={carro.entryDate ?? ""}
              className="campo"
            />
          </div>
          <div>
            <label className="rotulo">Valor cobrado</label>
            <input
              name="price"
              inputMode="decimal"
              defaultValue={carro.price}
              className="campo"
            />
          </div>
          <div>
            <label className="rotulo">Pasta das fotos no PC</label>
            <input
              name="photosFolder"
              defaultValue={carro.photosFolder ?? ""}
              className="campo"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo">Observações</label>
            <input name="notes" defaultValue={carro.notes ?? ""} className="campo" />
          </div>
          <div className="sm:col-span-2">
            <button className="botao">Salvar</button>
          </div>
        </form>

        <form action={excluirVeiculo} className="mt-4">
          <input type="hidden" name="id" value={carro.id} />
          <button className="text-xs text-neutral-400 hover:text-red-600">
            excluir carro
          </button>
        </form>
      </details>
    </main>
  );
}
