import { getAtividades } from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatarDataHora(iso: string) {
  const data = new Date(iso);
  return {
    dia: data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    hora: data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/**
 * Histórico de quem alterou o quê — pensado pra ser rápido de ler: uma
 * lista corrida, agrupada por dia, mais recente primeiro. Não tem
 * filtro nem paginação de propósito (é só as últimas 200 ações).
 */
export default async function HistoricoPage() {
  const atividades = await getAtividades();

  const grupos = new Map<string, typeof atividades>();
  for (const atividade of atividades) {
    const { dia } = formatarDataHora(atividade.at);
    const lista = grupos.get(dia) ?? [];
    lista.push(atividade);
    grupos.set(dia, lista);
  }

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Histórico</h1>
        <p className="mt-1 text-sm text-neutral-500">
          O que cada um mudou no sistema, mais recente primeiro.
        </p>
      </div>

      <section className="cartao overflow-hidden">
        {atividades.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-neutral-500">
            Nada registrado ainda.
          </p>
        )}
        {[...grupos.entries()].map(([dia, lista]) => (
          <div key={dia}>
            <div className="border-b border-t border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 first:border-t-0 dark:border-neutral-800 dark:bg-neutral-900">
              {dia}
            </div>
            {lista.map((atividade) => {
              const { hora } = formatarDataHora(atividade.at);
              return (
                <div
                  key={atividade.id}
                  className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2 last:border-0 dark:border-neutral-800"
                >
                  <span className="w-12 shrink-0 text-xs text-neutral-400">
                    {hora}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <strong className="font-medium">
                      {atividade.profileName ?? atividade.userName}
                    </strong>{" "}
                    <span className="text-neutral-500">
                      {atividade.description}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </main>
  );
}
