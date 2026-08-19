import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

// Em dev o Next recarrega os módulos a cada mudança; reaproveitar o pool evita
// estourar o limite de conexões do Postgres.
const globalForDb = globalThis as unknown as { pool?: Pool; db?: Db };

// Cache do módulo. Sem isto, cada acesso a `db.algumaCoisa` abriria um pool
// novo e o Postgres derrubaria a aplicação com "too many clients already".
let conexao: Db | undefined;

function conectar(): Db {
  if (conexao) return conexao;
  if (globalForDb.db) return (conexao = globalForDb.db);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Copie .env.example para .env.local e preencha."
    );
  }

  const pool =
    globalForDb.pool ??
    new Pool({
      connectionString,
      max: 5,
      ssl:
        connectionString.includes("localhost") ||
        connectionString.includes("127.0.0.1")
          ? false
          : { rejectUnauthorized: false },
    });

  conexao = drizzle(pool, { schema });

  // Em dev o Next recarrega os módulos a cada mudança, então o cache precisa
  // sobreviver fora do módulo.
  if (process.env.NODE_ENV !== "production") {
    globalForDb.pool = pool;
    globalForDb.db = conexao;
  }

  return conexao;
}

/**
 * A conexão só é aberta na primeira consulta, nunca no import.
 *
 * Isso importa de verdade: o Next importa estes módulos durante o build para
 * analisar as páginas, e o build (na Vercel ou no CI) roda sem banco. Se o
 * módulo tentasse conectar ao ser importado, o deploy inteiro quebraria.
 */
export const db = new Proxy({} as Db, {
  get(_alvo, propriedade, receptor) {
    return Reflect.get(conectar(), propriedade, receptor);
  },
});

export { schema };
