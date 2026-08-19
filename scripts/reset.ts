/**
 * Apaga TODOS os dados (mantém as tabelas) e roda o seed de novo.
 * Use só em desenvolvimento:  npm run db:reset
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  await db.execute(sql`
    truncate table
      count_items, counts, vehicle_services, stock_moves,
      service_type_items, service_types, vehicles, products
    restart identity cascade
  `);
  console.log("Banco limpo. Rode: npm run seed");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
