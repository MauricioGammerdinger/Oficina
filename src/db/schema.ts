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
  customerPhone: text("customer_phone"),
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

/**
 * Peças e itens avulsos comprados à parte pro carro (não vêm do estoque de
 * insumos): para-choque, farol, removedor de tinta, calafetagem, colagem
 * de parabrisa etc. Cada linha é só um nome + valor — sem controle de
 * estoque de peça, que é combinado que fica de fora do sistema.
 */
export const vehicleParts = pgTable(
  "vehicle_parts",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Valor previsto/orçado (ex.: o que a seguradora aprovou) */
    estimatedValue: doublePrecision("estimated_value"),
    /** Valor que realmente foi pago pela peça */
    paidValue: doublePrecision("paid_value"),
    /** nova | recuperada — usada/reaproveitada */
    condition: text("condition").notNull().default("nova"),
    /** genuina | paralela | usada — opcional, fica em branco se não informar */
    origin: text("origin"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("vehicle_parts_vehicle_idx").on(table.vehicleId)]
);

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

/**
 * Contas individuais (email + senha). Todo mundo que loga continua vendo
 * os mesmos dados de sempre — isso aqui não separa estoque por pessoa, só
 * identifica quem entrou e permite senha própria em vez da senha única
 * compartilhada de antes.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    /**
     * Hash do código de recuperação (mesmo formato do passwordHash) — quem
     * sabe email + esse código consegue trocar a própria senha sozinho, sem
     * precisar de admin nem de email de verdade. Fica nulo até a pessoa (ou
     * um admin) definir um; sem código definido, "esqueci minha senha" não
     * funciona pra essa conta.
     */
    recoveryCodeHash: text("recovery_code_hash"),
    /** Administrador: pode aprovar contas novas e resetar senha de alguém. */
    isAdmin: boolean("is_admin").notNull().default(false),
    // Nasce false pro cadastro público (aguardando aprovação); um admin
    // desativado usa o mesmo campo, com o mesmo efeito (não loga).
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unico").on(table.email)]
);

/**
 * Nomes de quem usa um mesmo login (email + senha) — pensado pra quando
 * duas pessoas (ex.: Cannabis e um ajudante) trabalham juntas e não faz
 * sentido cada uma ter email/senha próprios. Login continua sendo por
 * conta (`users`); depois de entrar, se a conta tiver 2+ perfis, escolhe
 * "quem é você" só pra identificar no histórico quem fez cada coisa —
 * não é uma segunda camada de senha.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("perfil_unico_por_login").on(table.userId, table.name)]
);

/**
 * Histórico de "quem alterou o quê e quando" — uma linha por ação
 * relevante (cadastrou carro, deu baixa, etc.), guardando o nome já
 * pronto (da conta e do perfil escolhido) em vez de só o id, pra o
 * histórico continuar legível mesmo se a conta ou o perfil forem
 * apagados depois.
 */
export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    userName: text("user_name").notNull(),
    /** Nome do perfil escolhido (Cannabis, Ramon...) — nulo se a conta não usa perfis. */
    profileName: text("profile_name"),
    description: text("description").notNull(),
  },
  (table) => [index("activity_log_at_idx").on(table.at)]
);

/**
 * Tabela sem uso hoje — cadastro era fechado por convite prévio (só quem
 * tinha o email aqui conseguia criar conta). Trocado por cadastro aberto +
 * aprovação de admin (ver `active` em users e `cadastrar`/`alternarUsuarioAtivo`
 * em actions.ts). Deixada no schema pra não precisar de migração só pra
 * isso; pode ser removida numa limpeza futura.
 */
export const allowedSignupEmails = pgTable(
  "allowed_signup_emails",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    /** Nome de quem é, só pra lembrar depois (ex.: "Cannabis"). */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("convites_email_unico").on(table.email)]
);
