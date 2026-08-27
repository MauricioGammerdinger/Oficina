import Link from "next/link";
import { recuperarSenha } from "@/app/actions";
import { IlustracaoOficina } from "@/components/ilustracao-oficina";

const MENSAGENS: Record<string, string> = {
  senhaCurta: "A senha nova precisa ter pelo menos 6 letras/números.",
  senhaDiferente: "As duas senhas digitadas não são iguais.",
  codigo:
    "Email ou código de recuperação incorretos — ou essa conta ainda não tem um código definido. Nesse caso, pede pra quem administra resetar sua senha em Usuários.",
};

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-8 sm:px-6">
      <div className="entrada-card grid w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="hidden bg-amber-50 sm:block dark:bg-neutral-950">
          <IlustracaoOficina />
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
          <p className="mb-6 mt-1 text-sm text-neutral-500">
            Digite seu email e o código de recuperação que você definiu no
            cadastro pra trocar a senha na hora, sem precisar de admin.
          </p>

          <form action={recuperarSenha} className="space-y-3">
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
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="codigo">
                Código de recuperação
              </label>
              <input
                id="codigo"
                name="codigo"
                type="text"
                className="campo"
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="novaSenha">
                Senha nova
              </label>
              <input
                id="novaSenha"
                name="novaSenha"
                type="password"
                autoComplete="new-password"
                minLength={6}
                className="campo"
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="confirmarNovaSenha">
                Confirmar senha nova
              </label>
              <input
                id="confirmarNovaSenha"
                name="confirmarNovaSenha"
                type="password"
                autoComplete="new-password"
                minLength={6}
                className="campo"
                required
              />
            </div>
            {erro && (
              <p className="text-sm text-red-600">
                {MENSAGENS[erro] ?? "Não deu pra trocar a senha. Confere os dados."}
              </p>
            )}
            <button className="botao w-full">Trocar senha</button>
          </form>

          <p className="mt-4 text-center text-xs text-neutral-400">
            Lembrou a senha?{" "}
            <Link href="/entrar" className="underline hover:text-neutral-600">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
