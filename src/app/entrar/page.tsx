import { entrar } from "@/app/actions";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold">Controle da Oficina</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">
        Estoque e checklist dos carros.
      </p>

      <form action={entrar} className="cartao space-y-3 p-4">
        <div>
          <label className="rotulo" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="campo"
          />
        </div>
        {erro && (
          <p className="text-sm text-red-600">Senha incorreta. Tenta de novo.</p>
        )}
        <button className="botao w-full">Entrar</button>
      </form>
    </main>
  );
}
