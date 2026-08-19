/**
 * O Next.js lê `.env.local` sozinho, mas scripts avulsos (drizzle-kit, seed,
 * reset) não passam pelo Next — e `import "dotenv/config"` sozinho só olha
 * para `.env`. Sem isso, quem seguiu o `.env.example` e criou só o
 * `.env.local` via DATABASE_URL indefinida nesses scripts, mesmo com o
 * `next dev` funcionando normalmente.
 *
 * Importe este arquivo antes de qualquer outra coisa:
 *   import "./carregar-env";
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config(); // completa com .env, sem sobrescrever o que .env.local já definiu
