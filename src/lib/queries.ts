import { sql } from "drizzle-orm";
import { db } from "@/db";
import { simulateFifo, type MoveForFifo } from "@/lib/fifo";

export type ProductRow = {
  id: number;
  name: string;
  unit: string;
  category: string | null;
  cost: number;
  minStock: number;
  balance: number;
};

const num = (v: unknown) => Number(v ?? 0);

/**
 * Saldo = soma dos movimentos. Entrada e ajuste somam, saída subtrai.
 * Nunca guardamos o saldo numa coluna, então não existe risco de
 * dessincronizar depois de um erro.
 */
export async function getProducts(): Promise<ProductRow[]> {
  const { rows } = await db.execute(sql`
    select
      p.id,
      p.name,
      p.unit,
      p.category,
      p.cost,
      p.min_stock                                as "minStock",
      coalesce(sum(
        case when m.kind = 'out' then -m.qty else m.qty end
      ), 0)                                      as balance
    from products p
    left join stock_moves m on m.product_id = p.id
    where p.active = true
    group by p.id
    order by p.category nulls last, p.name
  `);

  return rows.map((r) => ({
    id: num(r.id),
    name: String(r.name),
    unit: String(r.unit),
    category: r.category === null ? null : String(r.category),
    cost: num(r.cost),
    minStock: num(r.minStock),
    balance: num(r.balance),
  }));
}

/**
 * Histórico de movimentos de um insumo, na ordem que aconteceram — a
 * matéria-prima da simulação de lote (FIFO). Sempre lido do zero: nada
 * disso é guardado, só recalculado quando precisa.
 */
export async function getMoveHistoryForFifo(
  productId: number
): Promise<MoveForFifo[]> {
  const { rows } = await db.execute(sql`
    select id, kind, qty, unit_cost as "unitCost", created_at as "createdAt"
    from stock_moves
    where product_id = ${productId}
    order by created_at, id
  `);
  return rows.map((r) => ({
    id: num(r.id),
    kind: String(r.kind) as MoveForFifo["kind"],
    qty: num(r.qty),
    unitCost: r.unitCost === null ? null : num(r.unitCost),
    createdAt: String(r.createdAt),
  }));
}

/**
 * Lotes que sobraram de cada insumo, agrupados por preço — pra mostrar
 * "3kg a R$180 + 3kg a R$190" em vez de só um preço médio. Busca o
 * histórico inteiro de uma vez (todos os insumos) pra não fazer uma
 * consulta por produto na tela de estoque.
 */
export async function getLotesPorProduto(): Promise<
  Map<number, { qty: number; cost: number }[]>
> {
  const { rows } = await db.execute(sql`
    select
      m.product_id as "productId",
      m.id, m.kind, m.qty, m.unit_cost as "unitCost", m.created_at as "createdAt",
      p.cost as "refCost"
    from stock_moves m
    join products p on p.id = m.product_id
    where p.active = true
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

  const resultado = new Map<number, { qty: number; cost: number }[]>();
  for (const [productId, { moves, refCost }] of porProduto) {
    const { lots } = simulateFifo(moves, refCost);
    // Agrupa lotes que acabaram com o mesmo preço (ex.: duas entradas
    // separadas na mesma compra), pra não poluir a lista à toa.
    const agrupado = new Map<number, number>();
    for (const lote of lots) {
      if (lote.qty <= 1e-9) continue;
      agrupado.set(lote.cost, (agrupado.get(lote.cost) ?? 0) + lote.qty);
    }
    resultado.set(
      productId,
      [...agrupado.entries()].map(([cost, qty]) => ({ cost, qty }))
    );
  }

  return resultado;
}

export async function getShoppingList() {
  const products = await getProducts();
  return products
    .filter((p) =>
      // Mínimo 0 significa "não quero ser avisada deste item" — só alerta se
      // o saldo ficou negativo, que aí é erro de lançamento.
      p.minStock > 0 ? p.balance <= p.minStock : p.balance < 0
    )
    .map((p) => {
      // Sugestão: repor até o dobro do mínimo, para não comprar de novo
      // na semana seguinte.
      const target = p.minStock * 2;
      const suggested = Math.max(target - p.balance, 0);
      return {
        ...p,
        suggested,
        estimated: suggested * p.cost,
        zeroed: p.balance <= 0,
      };
    })
    .sort((a, b) => a.balance / (a.minStock || 1) - b.balance / (b.minStock || 1));
}

export type VehicleRow = {
  id: number;
  plate: string | null;
  model: string;
  customer: string | null;
  customerPhone: string | null;
  entryDate: string | null;
  price: number;
  status: string;
  photosFolder: string | null;
  notes: string | null;
  services: { id: number; name: string }[];
  /** Custo de material previsto pela receita dos serviços marcados */
  estimatedCost: number;
  /** Material que já saiu do estoque lançado nesse carro */
  actualCost: number;
  /** Peças/itens avulsos lançados nesse carro (pago, ou orçado se ainda não pagou) */
  partsCost: number;
};

export async function getVehicles(): Promise<VehicleRow[]> {
  const { rows } = await db.execute(sql`
    select
      v.id, v.plate, v.model, v.customer,
      v.customer_phone as "customerPhone",
      v.entry_date     as "entryDate",
      v.price, v.status,
      v.photos_folder  as "photosFolder",
      v.notes,
      coalesce(
        (select json_agg(json_build_object('id', st.id, 'name', st.name) order by st.name)
           from vehicle_services vs
           join service_types st on st.id = vs.service_type_id
          where vs.vehicle_id = v.id),
        '[]'::json
      ) as services,
      coalesce((
        select sum(sti.qty * p.cost)
          from vehicle_services vs
          join service_type_items sti on sti.service_type_id = vs.service_type_id
          join products p on p.id = sti.product_id
         where vs.vehicle_id = v.id
      ), 0) as "estimatedCost",
      coalesce((
        select sum(m.qty * coalesce(m.unit_cost, p.cost))
          from stock_moves m
          join products p on p.id = m.product_id
         where m.vehicle_id = v.id and m.kind = 'out'
      ), 0) as "actualCost",
      coalesce((
        select sum(coalesce(vp.paid_value, vp.estimated_value, 0))
          from vehicle_parts vp
         where vp.vehicle_id = v.id
      ), 0) as "partsCost"
    from vehicles v
    order by
      case v.status when 'andamento' then 0 when 'previsto' then 1 else 2 end,
      v.entry_date nulls last,
      v.id desc
  `);

  return rows.map((r) => ({
    id: num(r.id),
    plate: r.plate === null ? null : String(r.plate),
    model: String(r.model),
    customer: r.customer === null ? null : String(r.customer),
    customerPhone:
      r.customerPhone === null ? null : String(r.customerPhone),
    entryDate: r.entryDate === null ? null : String(r.entryDate),
    price: num(r.price),
    status: String(r.status),
    photosFolder: r.photosFolder === null ? null : String(r.photosFolder),
    notes: r.notes === null ? null : String(r.notes),
    services: (r.services as { id: number; name: string }[]) ?? [],
    estimatedCost: num(r.estimatedCost),
    actualCost: num(r.actualCost),
    partsCost: num(r.partsCost),
  }));
}

export async function getVehicle(id: number) {
  const all = await getVehicles();
  return all.find((v) => v.id === id) ?? null;
}

export type VehiclePartRow = {
  id: number;
  name: string;
  estimatedValue: number | null;
  paidValue: number | null;
  condition: string;
  /** genuina | paralela | usada | null — opcional */
  origin: string | null;
};

/** Peças/itens avulsos lançados nesse carro (para-choque, farol, removedor de tinta, etc.) */
export async function getVehicleParts(vehicleId: number): Promise<VehiclePartRow[]> {
  const { rows } = await db.execute(sql`
    select
      id, name,
      estimated_value as "estimatedValue",
      paid_value      as "paidValue",
      condition, origin
    from vehicle_parts
    where vehicle_id = ${vehicleId}
    order by id
  `);
  return rows.map((r) => ({
    id: num(r.id),
    name: String(r.name),
    estimatedValue: r.estimatedValue === null ? null : num(r.estimatedValue),
    paidValue: r.paidValue === null ? null : num(r.paidValue),
    condition: String(r.condition),
    origin: r.origin === null ? null : String(r.origin),
  }));
}

export type ServiceTypeRow = {
  id: number;
  name: string;
  notes: string | null;
  items: {
    id: number;
    productId: number;
    productName: string;
    unit: string;
    qty: number;
    cost: number;
  }[];
  totalCost: number;
};

export async function getServiceTypes(): Promise<ServiceTypeRow[]> {
  const { rows } = await db.execute(sql`
    select
      st.id, st.name, st.notes,
      coalesce((
        select json_agg(json_build_object(
                 'id', sti.id,
                 'productId', p.id,
                 'productName', p.name,
                 'unit', p.unit,
                 'qty', sti.qty,
                 'cost', p.cost
               ) order by p.name)
          from service_type_items sti
          join products p on p.id = sti.product_id
         where sti.service_type_id = st.id
      ), '[]'::json) as items,
      coalesce((
        select sum(sti.qty * p.cost)
          from service_type_items sti
          join products p on p.id = sti.product_id
         where sti.service_type_id = st.id
      ), 0) as "totalCost"
    from service_types st
    where st.active = true
    order by st.name
  `);

  return rows.map((r) => ({
    id: num(r.id),
    name: String(r.name),
    notes: r.notes === null ? null : String(r.notes),
    items: (r.items as ServiceTypeRow["items"]) ?? [],
    totalCost: num(r.totalCost),
  }));
}

/** Insumos previstos pelos serviços marcados no carro, agregados por produto. */
export async function getVehiclePlannedItems(vehicleId: number) {
  const { rows } = await db.execute(sql`
    select
      p.id, p.name, p.unit, p.cost,
      sum(sti.qty) as qty
    from vehicle_services vs
    join service_type_items sti on sti.service_type_id = vs.service_type_id
    join products p on p.id = sti.product_id
    where vs.vehicle_id = ${vehicleId}
    group by p.id
    order by p.name
  `);
  return rows.map((r) => ({
    id: num(r.id),
    name: String(r.name),
    unit: String(r.unit),
    cost: num(r.cost),
    qty: num(r.qty),
  }));
}

/** Movimentos de saída já lançados nesse carro. */
export async function getVehicleMoves(vehicleId: number) {
  const { rows } = await db.execute(sql`
    select
      m.id, m.qty, m.note,
      m.created_at as "createdAt",
      p.name as "productName", p.unit,
      m.qty * coalesce(m.unit_cost, p.cost) as total
    from stock_moves m
    join products p on p.id = m.product_id
    where m.vehicle_id = ${vehicleId} and m.kind = 'out'
    order by m.id desc
  `);
  return rows.map((r) => ({
    id: num(r.id),
    qty: num(r.qty),
    note: r.note === null ? null : String(r.note),
    createdAt: String(r.createdAt),
    productName: String(r.productName),
    unit: String(r.unit),
    total: num(r.total),
  }));
}

export async function getOpenCount() {
  const { rows } = await db.execute(sql`
    select id, note, created_at as "createdAt"
      from counts
     where closed_at is null
     order by id desc
     limit 1
  `);
  if (!rows.length) return null;
  const c = rows[0];

  const { rows: itemRows } = await db.execute(sql`
    select ci.id, ci.product_id as "productId", ci.counted_qty as "countedQty"
      from count_items ci
     where ci.count_id = ${num(c.id)}
  `);

  const counted = new Map<number, number | null>();
  for (const r of itemRows) {
    counted.set(
      num(r.productId),
      r.countedQty === null ? null : num(r.countedQty)
    );
  }

  const products = await getProducts();
  return {
    id: num(c.id),
    note: c.note === null ? null : String(c.note),
    createdAt: String(c.createdAt),
    lines: products.map((p) => ({
      ...p,
      countedQty: counted.get(p.id) ?? null,
    })),
  };
}

export async function getCountHistory() {
  const { rows } = await db.execute(sql`
    select
      c.id,
      c.note,
      c.created_at as "createdAt",
      c.closed_at  as "closedAt",
      (select count(*) from count_items ci
        where ci.count_id = c.id and ci.counted_qty is not null) as "linesCounted",
      coalesce((
        select sum(abs(ci.counted_qty - ci.system_qty) * p.cost)
          from count_items ci
          join products p on p.id = ci.product_id
         where ci.count_id = c.id and ci.counted_qty is not null
      ), 0) as "diffValue"
    from counts c
    where c.closed_at is not null
    order by c.closed_at desc
    limit 12
  `);
  return rows.map((r) => ({
    id: num(r.id),
    note: r.note === null ? null : String(r.note),
    closedAt: String(r.closedAt),
    linesCounted: num(r.linesCounted),
    diffValue: num(r.diffValue),
  }));
}

export async function getRecentMoves(limit = 40) {
  const { rows } = await db.execute(sql`
    select
      m.id, m.kind, m.qty, m.note,
      m.created_at as "createdAt",
      p.name as "productName", p.unit,
      v.model as "vehicleModel", v.plate as "vehiclePlate"
    from stock_moves m
    join products p on p.id = m.product_id
    left join vehicles v on v.id = m.vehicle_id
    order by m.id desc
    limit ${limit}
  `);
  return rows.map((r) => ({
    id: num(r.id),
    kind: String(r.kind),
    qty: num(r.qty),
    note: r.note === null ? null : String(r.note),
    createdAt: String(r.createdAt),
    productName: String(r.productName),
    unit: String(r.unit),
    vehicleModel: r.vehicleModel === null ? null : String(r.vehicleModel),
    vehiclePlate: r.vehiclePlate === null ? null : String(r.vehiclePlate),
  }));
}


/* --------------------------------------------------------- relatórios */

/**
 * Resumo geral do negócio: quanto entrou (carros concluídos), quanto saiu em
 * material, e a margem. É tudo-o-tempo-todo de propósito — com o volume de
 * uma oficina pequena, filtrar por mês corrido some com carros que atravessam
 * a virada do mês e confunde mais do que ajuda.
 */
export async function getResumoNegocio() {
  const { rows } = await db.execute(sql`
    select
      count(*)                                     as "carros",
      coalesce(sum(v.price), 0)                     as "faturado",
      coalesce(sum(m.custo), 0)                     as "material"
    from vehicles v
    left join lateral (
      select sum(sm.qty * coalesce(sm.unit_cost, p.cost)) as custo
        from stock_moves sm
        join products p on p.id = sm.product_id
       where sm.vehicle_id = v.id and sm.kind = 'out'
    ) m on true
    where v.status = 'concluido'
  `);
  const r = rows[0] ?? {};
  const faturado = num(r.faturado);
  const material = num(r.material);
  return {
    carros: num(r.carros),
    faturado,
    material,
    margem: faturado - material,
  };
}

/**
 * Gasto em compras (entradas de estoque) mês a mês, últimos `meses` meses —
 * inclusive os que não tiveram nenhuma compra, pra a barra não sumir do
 * gráfico e parecer erro.
 */
const MESES_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export async function getGastoComprasPorMes(meses = 6) {
  const { rows } = await db.execute(sql`
    select
      to_char(mes, 'YYYY-MM')                        as "mes",
      coalesce(sum(sm.qty * coalesce(sm.unit_cost, 0)), 0) as "total"
    from generate_series(
           date_trunc('month', now()) - (${meses - 1} || ' months')::interval,
           date_trunc('month', now()),
           interval '1 month'
         ) as mes
    left join stock_moves sm
      on sm.kind = 'in'
     and date_trunc('month', sm.created_at) = mes
    group by mes
    order by mes
  `);
  return rows.map((r) => {
    const mes = String(r.mes);
    const [ano, numMes] = mes.split("-");
    return {
      mes,
      rotulo: `${MESES_PT[Number(numMes) - 1]}/${ano.slice(2)}`,
      total: num(r.total),
    };
  });
}

/** Insumos que mais saíram do estoque nos últimos `dias` dias. */
export async function getTopConsumo(dias = 30, limit = 6) {
  const { rows } = await db.execute(sql`
    select
      p.name,
      p.unit,
      sum(sm.qty)                                     as "qty",
      sum(sm.qty * coalesce(sm.unit_cost, p.cost))     as "valor"
    from stock_moves sm
    join products p on p.id = sm.product_id
    where sm.kind = 'out'
      and sm.created_at >= now() - (${dias} || ' days')::interval
    group by p.id, p.name, p.unit
    order by valor desc
    limit ${limit}
  `);
  return rows.map((r) => ({
    name: String(r.name),
    unit: String(r.unit),
    qty: num(r.qty),
    valor: num(r.valor),
  }));
}

/**
 * Régua pra bater o olho se o consumo de insumo em lote (ex.: lixa, que sai
 * pro time sem vincular a um carro) está dentro do esperado: quantos carros
 * tiveram material lançado no período, e quantas peças/itens avulsos foram
 * peça nova x recuperada — pra comparar com o total de insumo consumido
 * (getTopConsumo) do mesmo período.
 */
export async function getAtividadePeriodo(dias = 30) {
  const { rows } = await db.execute(sql`
    select
      (select count(distinct vehicle_id)
         from stock_moves
        where kind = 'out'
          and vehicle_id is not null
          and created_at >= now() - (${dias} || ' days')::interval
      ) as "carros",
      (select count(*) from vehicle_parts
        where condition = 'nova'
          and created_at >= now() - (${dias} || ' days')::interval
      ) as "pecasNovas",
      (select count(*) from vehicle_parts
        where condition = 'recuperada'
          and created_at >= now() - (${dias} || ' days')::interval
      ) as "pecasRecuperadas"
  `);
  const r = rows[0] ?? {};
  return {
    carros: num(r.carros),
    pecasNovas: num(r.pecasNovas),
    pecasRecuperadas: num(r.pecasRecuperadas),
  };
}

/**
 * Quanto sumiu (ajuste negativo de contagem) em valor, desde sempre e nos
 * últimos 90 dias — é o número que mostra se está sumindo material sem
 * ninguém anotar.
 */
export async function getPerdaContagens() {
  const { rows } = await db.execute(sql`
    select
      coalesce(sum(case when sm.qty < 0 then -sm.qty * coalesce(sm.unit_cost, p.cost) else 0 end), 0) as "total",
      coalesce(sum(case when sm.qty < 0 and sm.created_at >= now() - interval '90 days'
                    then -sm.qty * coalesce(sm.unit_cost, p.cost) else 0 end), 0) as "ultimos90"
    from stock_moves sm
    join products p on p.id = sm.product_id
    where sm.kind = 'adjust'
  `);
  const r = rows[0] ?? {};
  return { total: num(r.total), ultimos90: num(r.ultimos90) };
}

/**
 * Compara o preço pago por insumo entre fornecedores diferentes — usa o
 * "onde comprou" que já é digitado na entrada de estoque, sem cadastro novo
 * de fornecedor. Só entra insumo que já foi comprado de mais de um lugar
 * (com preço e fornecedor preenchidos); senão não tem o que comparar.
 * Agrupa ignorando maiúsc./minúsc. e espaço, pra "Casa das Tintas" e "casa
 * das tintas" não virarem duas linhas por causa de digitação diferente.
 */
export async function getComparativoFornecedores() {
  const { rows } = await db.execute(sql`
    select
      p.id                                                     as "productId",
      p.name,
      p.unit,
      (array_agg(trim(sm.note) order by sm.created_at desc))[1] as fornecedor,
      (array_agg(sm.unit_cost order by sm.created_at desc))[1]  as "ultimoPreco",
      (array_agg(sm.created_at order by sm.created_at desc))[1] as data,
      count(*)                                                  as vezes
    from stock_moves sm
    join products p on p.id = sm.product_id
    where sm.kind = 'in'
      and sm.note is not null and trim(sm.note) <> ''
      and lower(trim(sm.note)) <> 'saldo inicial'
      and sm.unit_cost is not null and sm.unit_cost > 0
    group by p.id, p.name, p.unit, lower(trim(sm.note))
    order by p.name, "ultimoPreco" asc
  `);

  const porProduto = new Map<
    number,
    {
      productId: number;
      name: string;
      unit: string;
      fornecedores: {
        fornecedor: string;
        ultimoPreco: number;
        data: string;
        vezes: number;
      }[];
    }
  >();

  for (const r of rows) {
    const productId = num(r.productId);
    if (!porProduto.has(productId)) {
      porProduto.set(productId, {
        productId,
        name: String(r.name),
        unit: String(r.unit),
        fornecedores: [],
      });
    }
    porProduto.get(productId)!.fornecedores.push({
      fornecedor: String(r.fornecedor),
      ultimoPreco: num(r.ultimoPreco),
      data: String(r.data),
      vezes: num(r.vezes),
    });
  }

  // Só interessa quando dá pra comparar — ou seja, mais de um fornecedor.
  return [...porProduto.values()].filter((p) => p.fornecedores.length > 1);
}

/* --------------------------------------------------------------- usuários */

export type UserRow = {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
  active: boolean;
  createdAt: string;
  /** Se já tem um código de "esqueci minha senha" definido */
  temCodigoRecuperacao: boolean;
};

export async function getUsers(): Promise<UserRow[]> {
  const { rows } = await db.execute(sql`
    select id, email, name, is_admin as "isAdmin", active, created_at as "createdAt",
           (recovery_code_hash is not null) as "temCodigoRecuperacao"
    from users
    order by created_at
  `);
  return rows.map((r) => ({
    id: num(r.id),
    email: String(r.email),
    name: String(r.name),
    isAdmin: Boolean(r.isAdmin),
    active: Boolean(r.active),
    createdAt: String(r.createdAt),
    temCodigoRecuperacao: Boolean(r.temCodigoRecuperacao),
  }));
}

/* ------------------------------------------------------------------ perfis */

export type PerfilRow = { id: number; name: string };

/** Perfis (nomes) cadastrados sob um mesmo login — pra ela e quem trabalha
 * com ela aparecerem separados no histórico mesmo entrando com a mesma
 * conta. */
export async function getPerfis(userId: number): Promise<PerfilRow[]> {
  const { rows } = await db.execute(sql`
    select id, name from profiles where user_id = ${userId} order by created_at
  `);
  return rows.map((r) => ({ id: num(r.id), name: String(r.name) }));
}

/* --------------------------------------------------------------- histórico */

export type AtividadeRow = {
  id: number;
  at: string;
  userName: string;
  profileName: string | null;
  description: string;
};

/** Últimas ações registradas (quem fez o quê, e quando) — mais recente primeiro. */
export async function getAtividades(limite = 200): Promise<AtividadeRow[]> {
  const { rows } = await db.execute(sql`
    select id, at, user_name as "userName", profile_name as "profileName", description
    from activity_log
    order by at desc
    limit ${limite}
  `);
  return rows.map((r) => ({
    id: num(r.id),
    at: String(r.at),
    userName: String(r.userName),
    profileName: r.profileName === null ? null : String(r.profileName),
    description: String(r.description),
  }));
}

