import { salvarConfiguracaoAlerta } from "@/app/actions";
import { TestarAlertaBotao } from "@/components/testar-alerta-botao";
import { getAlertSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const config = await getAlertSettings();

  return (
    <main className="max-w-md space-y-5">
      <h1 className="text-lg font-semibold">Configurações</h1>

      <section className="cartao space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold">Alerta de compras por e-mail</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Quando algum insumo chegar no mínimo, manda um e-mail avisando o
            que comprar. É checado uma vez por dia.
          </p>
        </div>

        <form action={salvarConfiguracaoAlerta} className="space-y-3">
          <div>
            <label className="rotulo" htmlFor="email">
              E-mail para receber o alerta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={config.email ?? ""}
              placeholder="seuemail@exemplo.com"
              className="campo"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={config.enabled}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Alerta ativado
          </label>

          <button className="botao">Salvar</button>
        </form>

        <div className="border-t border-neutral-100 pt-4">
          <TestarAlertaBotao />
        </div>
      </section>
    </main>
  );
}
