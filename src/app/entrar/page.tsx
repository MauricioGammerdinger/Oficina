import Link from "next/link";
import { entrar } from "@/app/actions";
import { IlustracaoOficina } from "@/components/ilustracao-oficina";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; recuperada?: string }>;
}) {
  const { erro, recuperada } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-8 sm:px-6">
      <div className="entrada-card grid w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="hidden bg-amber-50 sm:block dark:bg-neutral-950">
          <IlustracaoOficina />
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Controle da Oficina</h1>
          <p className="mb-6 mt-1 text-sm text-neutral-500">
            Estoque e checklist dos carros.
          </p>

          {recuperada && (
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              Senha trocada! Já pode entrar com a senha nova.
            </p>
          )}

          <form action={entrar} className="space-y-3">
            <div>
              <label className="rotulo" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoFocus
                autoComplete="email"
                className="campo"
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="senha">
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                className="campo"
              />
            </div>
            {erro && (
              <p className="text-sm text-red-600">
                Email ou senha incorretos. Tenta de novo.
              </p>
            )}
            <button className="botao w-full">Entrar</button>
          </form>

          <p className="mt-4 text-center text-xs">
            <Link
              href="/esqueci-senha"
              className="text-neutral-400 underline hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Esqueci minha senha
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-neutral-400">
            Foi convidado(a) e ainda não tem conta?{" "}
            <Link href="/cadastrar" className="underline hover:text-neutral-600">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
