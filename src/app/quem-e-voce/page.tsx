import { redirect } from "next/navigation";
import { escolherPerfil } from "@/app/actions";
import { IlustracaoOficina } from "@/components/ilustracao-oficina";
import { getPerfis } from "@/lib/queries";
import { getUsuarioLogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * Tela que aparece depois do login quando o login tem 2+ perfis
 * cadastrados (Cannabis, Ramon...) — pergunta quem é, pra separar o que
 * cada um faz no histórico. Se só tiver um perfil (ou nenhum), o login
 * já pula direto pro sistema sem passar por aqui.
 */
export default async function QuemEVocePage() {
  const usuario = await getUsuarioLogado();
  if (!usuario) redirect("/entrar");

  const perfis = await getPerfis(usuario.id);
  if (perfis.length < 2) redirect("/estoque");

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-8 sm:px-6">
      <div className="entrada-card grid w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="hidden bg-amber-50 sm:block dark:bg-neutral-950">
          <IlustracaoOficina />
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Quem é você?</h1>
          <p className="mb-6 mt-1 text-sm text-neutral-500">
            Esse login é usado por mais de uma pessoa — escolhe seu nome
            pra aparecer certo no histórico.
          </p>

          <div className="space-y-2">
            {perfis.map((perfil) => (
              <form key={perfil.id} action={escolherPerfil}>
                <input type="hidden" name="profileId" value={perfil.id} />
                <button className="botao w-full">{perfil.name}</button>
              </form>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
