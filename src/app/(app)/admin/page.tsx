import { redirect } from "next/navigation";
import {
  alternarUsuarioAtivo,
  definirCodigoRecuperacao,
  resetarSenhaUsuario,
} from "@/app/actions";
import { getUsers } from "@/lib/queries";
import { getUsuarioLogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const usuario = await getUsuarioLogado();
  if (!usuario?.isAdmin) redirect("/estoque");

  const users = await getUsers();
  const pendentes = users.filter((u) => !u.active);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Usuários e acessos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Qualquer um pode criar conta na tela de cadastro, mas ela só
          funciona depois que você aprova aqui. Também dá pra resetar a
          senha de alguém se esquecer.
        </p>
      </div>

      {/* Pendentes de aprovação */}
      {pendentes.length > 0 && (
        <section className="cartao overflow-hidden border-amber-300 dark:border-amber-900">
          <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
            Aguardando aprovação
          </div>
          {pendentes.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2.5 last:border-0 dark:border-neutral-800"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {u.name}
                </span>
                <span className="block truncate text-xs text-neutral-400">
                  {u.email}
                </span>
              </span>
              <form action={alternarUsuarioAtivo}>
                <input type="hidden" name="id" value={u.id} />
                <button className="botao-claro">Aprovar acesso</button>
              </form>
            </div>
          ))}
        </section>
      )}

      {/* Contas */}
      <section className="cartao overflow-hidden">
        <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
          Contas
        </div>
        {users.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-neutral-500">
            Ninguém cadastrado ainda.
          </p>
        )}
        {users.map((u) => (
          <details
            key={u.id}
            className="group border-b border-neutral-100 last:border-0 dark:border-neutral-800"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {u.name}
                  {u.isAdmin && (
                    <span className="ml-1.5 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white dark:bg-neutral-100 dark:text-neutral-900">
                      admin
                    </span>
                  )}
                  {!u.active && (
                    <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                      desativado
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-neutral-400">
                  {u.email}
                </span>
              </span>
              <span className="shrink-0 text-neutral-300 transition group-open:rotate-180 dark:text-neutral-600">
                ▾
              </span>
            </summary>

            <div className="space-y-3 border-t border-neutral-100 bg-neutral-50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950">
              <form
                action={resetarSenhaUsuario}
                className="flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="id" value={u.id} />
                <div className="min-w-40 flex-1">
                  <label className="rotulo">Definir senha nova</label>
                  <input
                    name="novaSenha"
                    type="text"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    className="campo"
                  />
                </div>
                <button className="botao-claro">Salvar senha</button>
              </form>
              <p className="text-xs text-neutral-400">
                Digite uma senha nova e avise a pessoa por fora (WhatsApp,
                etc.) — não tem envio de email automático ainda.
              </p>

              <form
                action={definirCodigoRecuperacao}
                className="flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="id" value={u.id} />
                <div className="min-w-40 flex-1">
                  <label className="rotulo">
                    {u.temCodigoRecuperacao
                      ? "Trocar código de recuperação"
                      : "Definir código de recuperação"}
                  </label>
                  <input
                    name="novoCodigo"
                    type="text"
                    placeholder="Mínimo 4 caracteres"
                    minLength={4}
                    className="campo"
                  />
                </div>
                <button className="botao-claro">Salvar código</button>
              </form>
              <p className="text-xs text-neutral-400">
                {u.temCodigoRecuperacao ? (
                  "Já tem um código definido — a pessoa usa email + esse código em “Esqueci minha senha” pra trocar a senha sozinha, sem precisar de admin."
                ) : (
                  <>
                    <strong className="text-amber-600">Sem código ainda</strong> — enquanto não definir, &quot;Esqueci minha senha&quot; não funciona pra essa conta, e só um admin consegue resetar a senha dela.
                  </>
                )}
              </p>

              {u.id !== usuario.id && (
                <form action={alternarUsuarioAtivo}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="text-xs text-neutral-400 hover:text-red-600">
                    {u.active ? "desativar acesso" : "reativar acesso"}
                  </button>
                </form>
              )}
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}
