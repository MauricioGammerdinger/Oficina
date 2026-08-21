/**
 * Seed com insumos e tipos de serviço típicos de funilaria e pintura.
 * São só valores de exemplo para o sistema não abrir vazio — os preços e as
 * quantidades das receitas devem ser ajustados na tela de Serviços.
 *
 *   npm run seed
 */
import "./carregar-env";
import { eq, sql } from "drizzle-orm";

import { db } from "../src/db";
import {
  products,
  serviceTypeItems,
  serviceTypes,
  stockMoves,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/senha";
import { normalizarEmail } from "../src/lib/auth";

type Insumo = {
  name: string;
  unit: string;
  category: string;
  cost: number;
  minStock: number;
  initial: number;
};

const insumos: Insumo[] = [
  { name: "Massa poliéster 900g", unit: "un", category: "Massa", cost: 38, minStock: 4, initial: 6 },
  { name: "Massa rápida 400g", unit: "un", category: "Massa", cost: 26, minStock: 2, initial: 3 },
  { name: "Primer PU cinza 900ml", unit: "un", category: "Primer", cost: 95, minStock: 2, initial: 3 },
  { name: "Catalisador para primer 450ml", unit: "un", category: "Primer", cost: 48, minStock: 2, initial: 2 },
  { name: "Verniz PU 900ml", unit: "un", category: "Verniz", cost: 120, minStock: 2, initial: 4 },
  { name: "Catalisador para verniz 450ml", unit: "un", category: "Verniz", cost: 62, minStock: 2, initial: 3 },
  { name: "Tinta base branca", unit: "L", category: "Tinta", cost: 210, minStock: 1, initial: 2 },
  { name: "Tinta base preta", unit: "L", category: "Tinta", cost: 210, minStock: 1, initial: 1.5 },
  { name: "Pigmento perolizado", unit: "ml", category: "Pigmento", cost: 1.8, minStock: 200, initial: 350 },
  { name: "Pigmento metálico", unit: "ml", category: "Pigmento", cost: 1.2, minStock: 200, initial: 500 },
  { name: "Thinner 5L", unit: "un", category: "Solvente", cost: 85, minStock: 1, initial: 2 },
  { name: "Removedor de tinta 1L", unit: "un", category: "Solvente", cost: 55, minStock: 1, initial: 1 },
  { name: "Lixa 80", unit: "un", category: "Lixa", cost: 3.5, minStock: 20, initial: 40 },
  { name: "Lixa 220", unit: "un", category: "Lixa", cost: 3.5, minStock: 20, initial: 35 },
  { name: "Lixa 400", unit: "un", category: "Lixa", cost: 3.8, minStock: 20, initial: 25 },
  { name: "Lixa 600", unit: "un", category: "Lixa", cost: 4, minStock: 15, initial: 18 },
  { name: "Fita crepe 48mm", unit: "un", category: "Consumível", cost: 12, minStock: 6, initial: 10 },
  { name: "Papel para mascarar (rolo)", unit: "un", category: "Consumível", cost: 45, minStock: 2, initial: 3 },
  { name: "Disco de lixa 3M", unit: "un", category: "Lixa", cost: 6.5, minStock: 20, initial: 30 },
  { name: "Polidor de corte 1kg", unit: "un", category: "Polimento", cost: 78, minStock: 1, initial: 1 },
  { name: "Boina de lã", unit: "un", category: "Polimento", cost: 55, minStock: 1, initial: 2 },
  { name: "Máscara / luva (kit)", unit: "un", category: "EPI", cost: 18, minStock: 5, initial: 8 },
];

type Receita = { servico: string; notas?: string; itens: [string, number][] };

const receitas: Receita[] = [
  {
    servico: "Recuperação de peça (funilaria + massa)",
    notas: "Amassado médio, uma peça",
    itens: [
      ["Massa poliéster 900g", 0.5],
      ["Lixa 80", 3],
      ["Lixa 220", 3],
      ["Disco de lixa 3M", 4],
      ["Fita crepe 48mm", 0.3],
    ],
  },
  {
    servico: "Pintura de uma peça (sem pigmento especial)",
    itens: [
      ["Primer PU cinza 900ml", 0.3],
      ["Catalisador para primer 450ml", 0.15],
      ["Tinta base branca", 0.25],
      ["Verniz PU 900ml", 0.35],
      ["Catalisador para verniz 450ml", 0.18],
      ["Thinner 5L", 0.15],
      ["Lixa 400", 2],
      ["Lixa 600", 2],
      ["Fita crepe 48mm", 0.5],
      ["Papel para mascarar (rolo)", 0.2],
    ],
  },
  {
    servico: "Pintura com pigmento perolizado (adicional)",
    notas: "Some junto com a pintura normal — pigmento é o que encarece",
    itens: [
      ["Pigmento perolizado", 80],
      ["Verniz PU 900ml", 0.15],
    ],
  },
  {
    servico: "Pintura com pigmento metálico (adicional)",
    itens: [["Pigmento metálico", 90]],
  },
  {
    servico: "Batida de pedra / capô inteiro",
    itens: [
      ["Massa rápida 400g", 0.4],
      ["Primer PU cinza 900ml", 0.4],
      ["Catalisador para primer 450ml", 0.2],
      ["Lixa 220", 4],
      ["Lixa 400", 3],
      ["Disco de lixa 3M", 5],
    ],
  },
  {
    servico: "Remoção de tinta antiga",
    itens: [
      ["Removedor de tinta 1L", 0.5],
      ["Lixa 80", 4],
      ["Máscara / luva (kit)", 1],
    ],
  },
  {
    servico: "Polimento de acabamento",
    itens: [
      ["Polidor de corte 1kg", 0.15],
      ["Boina de lã", 0.1],
    ],
  },
];

async function main() {
  const existentes = await db.select({ id: products.id }).from(products);
  if (existentes.length > 0) {
    console.log(
      `Já existem ${existentes.length} insumos no banco — seed cancelado para não duplicar.`
    );
    console.log("Para começar de novo: npm run db:reset");
    process.exit(0);
  }

  const idPorNome = new Map<string, number>();

  for (const insumo of insumos) {
    const [criado] = await db
      .insert(products)
      .values({
        name: insumo.name,
        unit: insumo.unit,
        category: insumo.category,
        cost: insumo.cost,
        minStock: insumo.minStock,
      })
      .returning({ id: products.id });

    idPorNome.set(insumo.name, criado.id);

    if (insumo.initial > 0) {
      await db.insert(stockMoves).values({
        productId: criado.id,
        kind: "in",
        qty: insumo.initial,
        unitCost: insumo.cost,
        note: "Saldo inicial",
      });
    }
  }

  for (const receita of receitas) {
    const [tipo] = await db
      .insert(serviceTypes)
      .values({ name: receita.servico, notes: receita.notas ?? null })
      .returning({ id: serviceTypes.id });

    for (const [nomeInsumo, quantidade] of receita.itens) {
      const productId = idPorNome.get(nomeInsumo);
      if (!productId) {
        console.warn(`Insumo não encontrado na receita: ${nomeInsumo}`);
        continue;
      }
      await db.insert(serviceTypeItems).values({
        serviceTypeId: tipo.id,
        productId,
        qty: quantidade,
      });
    }
  }

  // Conta de teste, só pra dev/smoke test conseguir logar sem precisar
  // rodar o script de criar-admin à parte. Nunca roda em produção (esse
  // script só existe pra popular banco de teste).
  const emailTeste = normalizarEmail(process.env.TEST_EMAIL ?? "teste@teste.com");
  const senhaTeste = process.env.TEST_PASSWORD ?? "oficina123";
  const [existente] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, emailTeste));
  if (!existente) {
    await db.insert(users).values({
      email: emailTeste,
      name: "Conta de teste",
      passwordHash: await hashPassword(senhaTeste),
      isAdmin: true,
    });
  }

  const [{ total }] = (
    await db.execute(sql`select count(*)::int as total from products`)
  ).rows as { total: number }[];

  console.log(
    `Seed pronto: ${total} insumos e ${receitas.length} tipos de serviço. Login: ${emailTeste} / ${senhaTeste}`
  );
  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
