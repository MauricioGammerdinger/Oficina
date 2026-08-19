import { sql } from "drizzle-orm";
import { db } from "@/db";

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
};

export async function getVehicles(): Promise<VehicleRow[]> {
  const { rows } = await db.execute(sql`
    select
      v.id, v.plate, v.model, v.customer,
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
      ), 0) as "actualCost"
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
    entryDate: r.entryDate === null ? null : String(r.entryDate),
    price: num(r.price),
    status: String(r.status),
    photosFolder: r.photosFolder === null ? null : String(r.photosFolder),
    notes: r.notes === null ? null : String(r.notes),
    services: (r.services as { id: number; name: string }[]) ?? [],
    estimatedCost: num(r.estimatedCost),
    actualCost: num(r.actualCost),
  }));
}

export async function getVehicle(id: number) {
  const all = await getVehicles();
  return all.find((v) => v.id === id) ?? null;
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
