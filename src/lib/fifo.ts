/**
 * Simulação de estoque por lote (FIFO — primeiro que entra, primeiro que
 * sai). Isso NÃO substitui o jeito que o saldo é calculado hoje (soma de
 * entradas menos saídas, sempre a partir do histórico) — é uma camada por
 * cima: em vez de todo insumo ter um preço de referência único que se
 * sobrescreve a cada compra, cada entrada vira um "lote" com seu próprio
 * preço, e as saídas vão descontando o lote mais antigo primeiro.
 *
 * O resultado (o custo FIFO de cada saída) é gravado direto na própria
 * coluna `unit_cost` do movimento, no momento em que ele é criado — nunca
 * como um saldo derivado guardado à parte. Os relatórios que já usam
 * `coalesce(sm.unit_cost, p.cost)` passam a ficar corretos sozinhos,
 * porque só usam o preço de referência (`p.cost`) quando o movimento não
 * tem custo próprio — e agora as saídas passam a ter.
 */

export type MoveKind = "in" | "out" | "adjust";

export type MoveForFifo = {
  id: number;
  kind: MoveKind;
  /** Positivo em in/out; pode ser negativo em adjust. */
  qty: number;
  unitCost: number | null;
  createdAt: Date | string;
};

export type Lot = { qty: number; cost: number };

export type FifoResult = {
  /** Lotes que sobraram, do mais antigo pro mais novo. */
  lots: Lot[];
  /** Custo unitário calculado pra cada saída / ajuste negativo. */
  costOfMove: Map<number, number>;
};

const EPS = 1e-9;

function ordenar(moves: MoveForFifo[]): MoveForFifo[] {
  return [...moves].sort((a, b) => {
    const diff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return diff !== 0 ? diff : a.id - b.id;
  });
}

/**
 * Reprocessa o histórico inteiro de um insumo e devolve os lotes que
 * sobraram + o custo FIFO de cada saída/ajuste negativo já lançado.
 *
 * `fallbackCost` (o preço de referência atual do insumo) só é usado se
 * faltar lote no meio do caminho — por exemplo, saldo negativo por algum
 * lançamento fora de ordem — pra nunca travar o cálculo.
 */
export function simulateFifo(
  moves: MoveForFifo[],
  fallbackCost: number
): FifoResult {
  const lots: Lot[] = [];
  const costOfMove = new Map<number, number>();

  for (const m of ordenar(moves)) {
    const entrada = m.kind === "in" || (m.kind === "adjust" && m.qty > EPS);
    if (entrada) {
      const qty = Math.abs(m.qty);
      if (qty > EPS) lots.push({ qty, cost: m.unitCost ?? fallbackCost });
      continue;
    }

    const saida =
      m.kind === "out" || (m.kind === "adjust" && m.qty < -EPS);
    if (!saida) continue;

    let restante = m.kind === "out" ? m.qty : -m.qty;
    if (restante <= EPS) continue;

    let custoTotal = 0;
    let qtdConsumida = 0;
    while (restante > EPS && lots.length) {
      const lote = lots[0];
      const pega = Math.min(lote.qty, restante);
      custoTotal += pega * lote.cost;
      qtdConsumida += pega;
      lote.qty -= pega;
      restante -= pega;
      if (lote.qty <= EPS) lots.shift();
    }
    if (restante > EPS) {
      // Faltou lote (saldo negativo) — usa o preço de referência pro resto,
      // pra sempre conseguir terminar o cálculo.
      custoTotal += restante * fallbackCost;
      qtdConsumida += restante;
    }
    costOfMove.set(m.id, qtdConsumida > EPS ? custoTotal / qtdConsumida : fallbackCost);
  }

  return { lots, costOfMove };
}

/**
 * Calcula o custo FIFO de uma saída (ou ajuste negativo) que está prestes a
 * acontecer AGORA, a partir do histórico já lançado — usada no momento de
 * gravar o novo movimento, pra guardar o custo real junto com ele.
 */
export function fifoCostForNewConsumption(
  history: MoveForFifo[],
  qtyToConsume: number,
  fallbackCost: number
): number {
  const { lots } = simulateFifo(history, fallbackCost);

  let restante = qtyToConsume;
  let custoTotal = 0;
  let qtdConsumida = 0;
  for (const lote of lots) {
    if (restante <= EPS) break;
    const pega = Math.min(lote.qty, restante);
    custoTotal += pega * lote.cost;
    qtdConsumida += pega;
    restante -= pega;
  }
  if (restante > EPS) {
    custoTotal += restante * fallbackCost;
    qtdConsumida += restante;
  }
  return qtdConsumida > EPS ? custoTotal / qtdConsumida : fallbackCost;
}
