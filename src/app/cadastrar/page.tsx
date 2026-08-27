import Link from "next/link";
import { cadastrar } from "@/app/actions";
import { IlustracaoOficina } from "@/components/ilustracao-oficina";

const MENSAGENS: Record<string, string> = {
  dados: "Preenche o nome e o email.",
  senhaCurta: "A senha precisa ter pelo menos 6 letras/números.",
  senhaDiferente: "As duas senhas digitadas não são iguais.",
  codigoCurto: "O código de recuperação precisa ter pelo menos 4 letras/números.",
  jaExiste: "Já existe uma conta com esse email — tenta entrar em vez de cadastrar.",
};

export default async function CadastrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-8 sm:px-6">
      <div className="entrada-card grid w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm sm:grid-cols-2 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Ilustração — só em telas maiores, pra não empurrar o formulário
            pra baixo do "dobrado" no celular. */}
        <div className="hidden bg-amber-50 sm:block dark:bg-neutral-950">
          <IlustracaoOficina />
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Criar conta</h1>
          <p className="mb-6 mt-1 text-sm text-neutral-500">
            Depois de criar, sua conta fica aguardando aprovação — só
            funciona depois que quem administra o Controle da Oficina
            liberar o acesso.
          </p>

          <form action={cadastrar} className="space-y-3">
            <div>
              <label className="rotulo" htmlFor="name">
                Seu nome
              </label>
              <input id="name" name="name" autoFocus className="campo" required />
            </div>
            <div>
              <label className="rotulo" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="campo"
                required
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
                autoComplete="new-password"
                minLength={6}
                className="campo"
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="confirmarSenha">
                Confirmar senha
              </label>
              <input
                id="confirmarSenha"
                name="confirmarSenha"
                type="password"
                autoComplete="new-password"
                minLength={6}
                className="campo"
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="codigoRecuperacao">
                Código de recuperação
              </label>
              <input
                id="codigoRecuperacao"
                name="codigoRecuperacao"
                type="text"
                minLength={4}
                placeholder="Uma palavra ou número só seu, mín. 4 caracteres"
                className="campo"
                required
              />
              <p className="mt-1 text-xs text-neutral-400">
                Guarda esse código — junto com o email, ele troca sua senha
                sozinho em &quot;Esqueci minha senha&quot;, sem precisar de
                admin.
              </p>
            </div>
            {erro && (
              <p className="text-sm text-red-600">
                {MENSAGENS[erro] ?? "Não deu pra criar a conta. Confere os dados."}
              </p>
            )}
            <button className="botao w-full">Criar conta</button>
          </form>

          <p className="mt-4 text-center text-xs text-neutral-400">
            Já tem conta?{" "}
            <Link href="/entrar" className="underline hover:text-neutral-600">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
