import {
  pgTable,
  serial,
  text,
  doublePrecision,
  timestamp,
  integer,
  date,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Insumos: tintas, massas, primer, pigmentos, lixas, etc. */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("un"), // un, L, ml, kg, g, m
  category: text("category"),
  /** Preço unitário de compra (referência para o cálculo de custo) */
  cost: doublePrecision("cost").notNull().default(0),
  /** Estoque de segurança: abaixo disso, entra na lista de compras */
  minStock: doublePrecision("min_stock").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Toda movimentação de estoque. O saldo é sempre a soma dos movimentos —
 * nunca um número guardado que pode dessincronizar.
 * kind: 'in' entrada | 'out' saída | 'adjust' ajuste de contagem
 * qty é sempre positivo em in/out; em adjust pode ser negativo.
 */
export const stockMoves = pgTable(
  "stock_moves",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    qty: doublePrecision("qty").notNull(),
    unitCost: doublePrecision("unit_cost"),
    note: text("note"),
    vehicleId: integer("vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("stock_moves_product_idx").on(table.productId),
    index("stock_moves_vehicle_idx").on(table.vehicleId),
  ]
);

/** Tipos de serviço: recuperação de para-choque, pintura de capô, massa, etc. */
export const serviceTypes = pgTable("service_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
});

/** Receita: quanto de cada insumo um tipo de serviço costuma consumir. */
export const serviceTypeItems = pgTable(
  "service_type_items",
  {
    id: serial("id").primaryKey(),
    serviceTypeId: integer("service_type_id")
      .notNull()
      .references(() => serviceTypes.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    qty: doublePrecision("qty").notNull().default(0),
  },
  // Um insumo aparece uma única vez por receita, mesmo com dois cliques
  // rápidos no mesmo botão.
  (table) => [
    uniqueIndex("receita_unica").on(table.serviceTypeId, table.productId),
  ]
);

/** Carros previstos / em andamento / concluídos */
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  plate: text("plate"),
  model: text("model").notNull(),
  customer: text("customer"),
  entryDate: date("entry_date"),
  /** Valor cobrado pelo serviço */
  price: doublePrecision("price").notNull().default(0),
  status: text("status").notNull().default("previsto"), // previsto | andamento | concluido
  /** Pasta no PC onde ficam as fotos do check-in */
  photosFolder: text("photos_folder"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Checklist: quais serviços vão ser feitos nesse carro */
export const vehicleServices = pgTable(
  "vehicle_services",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    serviceTypeId: integer("service_type_id")
      .notNull()
      .references(() => serviceTypes.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("servico_unico_por_carro").on(
      table.vehicleId,
      table.serviceTypeId
    ),
  ]
);

/** Contagem física (inventário) */
export const counts = pgTable("counts", {
  id: serial("id").primaryKey(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const countItems = pgTable(
  "count_items",
  {
    id: serial("id").primaryKey(),
    countId: integer("count_id")
      .notNull()
      .references(() => counts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Saldo que o sistema achava que tinha, no momento do fechamento */
    systemQty: doublePrecision("system_qty").notNull().default(0),
    /** Saldo contado de verdade na prateleira */
    countedQty: doublePrecision("counted_qty"),
  },
  (table) => [
    uniqueIndex("item_unico_por_contagem").on(table.countId, table.productId),
  ]
);
