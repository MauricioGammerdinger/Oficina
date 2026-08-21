/**
 * Recalcula o custo FIFO das saídas e ajustes negativos JÁ lançados no
 * histórico, e grava em `unit_cost` — pra relatórios antigos (perda em
 * contagem, insumo que mais saiu, etc.) também passarem a bater com o
 * preço real do lote consumido, e não só as saídas lançadas de hoje em
 * diante.
 *
 * Roda uma vez só depois do deploy que introduziu o estoque por lote.
 * Rodar de novo não faz mal (é idempotente: sempre recalcula do zero a
 * partir do histórico, na mesma ordem), mas também não é necessário.
 *
 *   npm run db:backfill-fifo
 */
import "./carregar-env";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { simulateFifo, type MoveForFifo } from "../src/lib/fifo";

const num = (v: unknown) => Number(v ?? 0);

async function main() {
  const { rows } = await db.execute(sql`
    select
      m.id, m.product_id as "productId", m.kind, m.qty,
      m.unit_cost as "unitCost", m.created_at as "createdAt",
      p.cost as "refCost"
    from stock_moves m
    join products p on p.id = m.product_id
    order by m.product_id, m.created_at, m.id
  `);

  const porProduto = new Map<
    number,
    { moves: MoveForFifo[]; refCost: number }
  >();
  for (const r of rows) {
    const productId = num(r.productId);
    if (!porProduto.has(productId)) {
      porProduto.set(productId, { moves: [], refCost: num(r.refCost) });
    }
    porProduto.get(productId)!.moves.push({
      id: num(r.id),
      kind: String(r.kind) as MoveForFifo["kind"],
      qty: num(r.qty),
      unitCost: r.unitCost === null ? null : num(r.unitCost),
      createdAt: String(r.createdAt),
    });
  }

  let atualizados = 0;
  for (const [, { moves, refCost }] of porProduto) {
    const { costOfMove } = simulateFifo(moves, refCost);
    for (const m of moves) {
      const saidaOuAjusteNegativo =
        m.kind === "out" || (m.kind === "adjust" && m.qty < 0);
      if (!saidaOuAjusteNegativo) continue;

      const custoFifo = costOfMove.get(m.id);
      if (custoFifo === undefined) continue;
      // Já tinha um custo próprio gravado (não devia acontecer hoje em
      // saída/ajuste, mas por segurança não sobrescreve se já tiver).
      if (m.unitCost !== null) continue;

      await db.execute(sql`
        update stock_moves set unit_cost = ${custoFifo} where id = ${m.id}
      `);
      atualizados++;
    }
  }

  console.log(`Pronto. ${atualizados} movimentos atualizados com custo FIFO.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
