import { criarPerfil, removerPerfil } from "@/app/actions";
import { IconeLixo } from "@/components/icones-acao";
import { getPerfis } from "@/lib/queries";
import { getUsuarioLogado } from "@/lib/sessao";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Autoatendimento: quem está logado adiciona/remove os nomes que
 * compartilham esse login (Cannabis, Ramon...). Precisa de 2+ nomes pra
 * a tela "quem é você" aparecer depois do login — com 0 ou 1, o login
 * segue direto sem perguntar nada.
 */
export default async function PerfisPage() {
  const usuario = await getUsuarioLogado();
  if (!usuario) redirect("/entrar");

  const perfis = await getPerfis(usuario.id);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Quem usa esse login</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cadastra o nome de cada pessoa que usa esse mesmo email e senha.
          Com 2 ou mais nomes, o login passa a perguntar quem é depois de
          entrar — isso é só pra separar quem fez o quê no histórico, não
          é uma senha separada por pessoa.
        </p>
      </div>

      <section className="cartao overflow-hidden">
        <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
          Nomes cadastrados
        </div>
        {perfis.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-neutral-500">
            Ninguém cadastrado ainda — enquanto isso, tudo aparece no
            histórico com o nome da conta ({usuario.name}).
          </p>
        )}
        {perfis.map((perfil) => (
          <div
            key={perfil.id}
            className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2.5 last:border-0 dark:border-neutral-800"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {perfil.name}
            </span>
            <form action={removerPerfil}>
              <input type="hidden" name="id" value={perfil.id} />
              <button className="link-perigo">
                <IconeLixo className="h-3.5 w-3.5" />
                remover
              </button>
            </form>
          </div>
        ))}

        <form
          action={criarPerfil}
          className="flex flex-wrap items-end gap-2 border-t border-neutral-100 px-3 py-3 dark:border-neutral-800"
        >
          <div className="min-w-40 flex-1">
            <label className="rotulo">Adicionar nome</label>
            <input
              name="name"
              placeholder="Ex.: Ramon"
              className="campo"
              required
            />
          </div>
          <button className="botao-claro">Adicionar</button>
        </form>
      </section>
    </main>
  );
}
