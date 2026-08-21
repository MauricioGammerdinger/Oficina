import Link from "next/link";

import { criarVeiculo } from "@/app/actions";
import { money } from "@/lib/parse";
import { getVehicles, type VehicleRow } from "@/lib/queries";

export const dynamic = "force-dynamic";

const rotuloStatus: Record<string, string> = {
  previsto: "Previsto",
  andamento: "Em andamento",
  concluido: "Concluído",
};

function CartaoCarro({ carro }: { carro: VehicleRow }) {
  // Enquanto o carro não fecha, o custo que vale é o previsto pela receita.
  // Depois de fechado, o que vale é o material que realmente saiu.
  const custo =
    carro.status === "concluido" && carro.actualCost > 0
      ? carro.actualCost
      : carro.estimatedCost;
  const margem = carro.price - custo;
  const percentual = carro.price > 0 ? (margem / carro.price) * 100 : null;

  return (
    <Link
      href={`/carros/${carro.id}`}
      className="block p-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-900"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {carro.model}
            {carro.plate && (
              <span className="ml-1.5 font-normal text-neutral-400">
                {carro.plate}
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {carro.entryDate
              ? new Date(`${carro.entryDate}T12:00:00`).toLocaleDateString(
                  "pt-BR",
                  { day: "2-digit", month: "2-digit" }
                )
              : "sem data"}
            {carro.customer ? ` · ${carro.customer}` : ""}
            {carro.services.length
              ? ` · ${carro.services.map((s) => s.name).join(", ")}`
              : " · sem serviço marcado"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {money(carro.price)}
          </p>
          <p className="text-xs tabular-nums text-neutral-500">
            material {money(custo)}
          </p>
          <p
            className={`text-xs font-semibold tabular-nums ${
              margem < 0 ? "text-red-600" : "text-emerald-700"
            }`}
          >
            sobra {money(margem)}
            {percentual !== null && (
              <span className="font-normal text-neutral-400">
                {" "}
                ({percentual.toFixed(0)}%)
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function CarrosPage() {
  const carros = await getVehicles();

  const grupos = [
    { chave: "andamento", itens: carros.filter((c) => c.status === "andamento") },
    { chave: "previsto", itens: carros.filter((c) => c.status === "previsto") },
    { chave: "concluido", itens: carros.filter((c) => c.status === "concluido") },
  ].filter((g) => g.itens.length > 0);

  const abertos = carros.filter((c) => c.status !== "concluido");
  const receita = abertos.reduce((s, c) => s + c.price, 0);
  const material = abertos.reduce((s, c) => s + c.estimatedCost, 0);

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Carros</h1>
        {abertos.length > 0 && (
          <p className="text-sm text-neutral-500">
            {abertos.length} em aberto · {money(receita)} −{" "}
            {money(material)} de material ={" "}
            <span
              className={`font-semibold ${
                receita - material < 0 ? "text-red-600" : "text-neutral-800 dark:text-neutral-200"
              }`}
            >
              {money(receita - material)}
            </span>
          </p>
        )}
      </div>

      <details className="cartao p-4">
        <summary className="cursor-pointer text-sm font-medium dark:text-neutral-200">
          + Novo carro
        </summary>
        <form action={criarVeiculo} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="rotulo">Modelo</label>
            <input
              name="model"
              placeholder="Ex.: Gol G6 prata"
              className="campo"
              required
            />
          </div>
          <div>
            <label className="rotulo">Placa</label>
            <input name="plate" className="campo" />
          </div>
          <div>
            <label className="rotulo">Cliente</label>
            <input name="customer" className="campo" />
          </div>
          <div>
            <label className="rotulo">Telefone do cliente</label>
            <input
              name="customerPhone"
              type="tel"
              placeholder="Ex.: (11) 91234-5678"
              className="campo"
            />
          </div>
          <div>
            <label className="rotulo">Data de entrada</label>
            <input name="entryDate" type="date" className="campo" />
          </div>
          <div>
            <label className="rotulo">Valor cobrado</label>
            <input name="price" inputMode="decimal" placeholder="0,00" className="campo" />
          </div>
          <div>
            <label className="rotulo">Pasta das fotos no PC</label>
            <input
              name="photosFolder"
              placeholder="Ex.: D:\Check-in\Gol ABC1234"
              className="campo"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo">Observações</label>
            <input name="notes" className="campo" />
          </div>
          <div className="sm:col-span-2">
            <button className="botao">Cadastrar e marcar serviços</button>
          </div>
        </form>
      </details>

      {grupos.length === 0 && (
        <div className="cartao p-8 text-center text-sm text-neutral-500">
          Nenhum carro cadastrado ainda.
        </div>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.chave}>
          <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {rotuloStatus[grupo.chave]} ({grupo.itens.length})
          </h2>
          <div className="cartao divide-y divide-neutral-100 dark:divide-neutral-800">
            {grupo.itens.map((carro) => (
              <CartaoCarro key={carro.id} carro={carro} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
