"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  activityLog,
  countItems,
  counts,
  products,
  profiles,
  serviceTypeItems,
  serviceTypes,
  stockMoves,
  users,
  vehicleParts,
  vehicleServices,
  vehicles,
} from "@/db/schema";
import { COOKIE_NAME, criarSessao, normalizarEmail, VALIDADE_MS } from "@/lib/auth";
import { fifoCostForNewConsumption } from "@/lib/fifo";
import { parseId, parseNum, parseStr } from "@/lib/parse";
import {
  getMoveHistoryForFifo,
  getPerfis,
  getProducts,
  getVehiclePlannedItems,
} from "@/lib/queries";
import { getUsuarioLogado } from "@/lib/sessao";
import { HASH_FALSO, hashPassword, verifyPassword } from "@/lib/senha";

async function abrirSessaoPara(userId: number, profileId: number | null = null) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, await criarSessao(userId, profileId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(VALIDADE_MS / 1000),
  });
}

/**
 * Registra uma linha no histórico ("quem fez o quê, quando"). Silencioso
 * se por algum motivo não tiver sessão — nunca deve travar a ação em si
 * por causa do registro dela.
 */
async function registrarAtividade(description: string) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return;
  await db.insert(activityLog).values({
    userId: usuario.id,
    userName: usuario.name,
    profileName: usuario.profileName,
    description,
  });
}

/* ------------------------------------------------------------------ login */

export async function entrar(formData: FormData) {
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  const senha = String(formData.get("senha") ?? "");

  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      active: users.active,
    })
    .from(users)
    .where(eq(users.email, email));

  // Confere a senha mesmo quando o email não existe (contra um hash
  // qualquer), pra não dar mais rápido pra descobrir emails sem conta.
  const senhaOk = await verifyPassword(senha, user?.passwordHash ?? HASH_FALSO);

  if (!user || !senhaOk) redirect("/entrar?erro=1");
  // Conta existe e a senha está certa, mas ainda não foi aprovada (ou foi
  // desativada por um admin) — mensagem diferente da de senha errada.
  if (!user.active) redirect("/entrar?erro=pendente");

  // Login é só por conta; "perfil" é só pra saber quem, entre quem usa o
  // mesmo login, fez cada coisa (histórico) — sem perfil ou com só um
  // cadastrado, entra direto sem perguntar nada.
  const perfis = await getPerfis(user.id);
  await abrirSessaoPara(user.id, perfis.length === 1 ? perfis[0].id : null);
  redirect(perfis.length >= 2 ? "/quem-e-voce" : "/estoque");
}

/**
 * Troca o perfil ativo dentro da mesma sessão já logada — sem pedir senha
 * de novo. É só reassinar o cookie com o novo profileId.
 */
export async function escolherPerfil(formData: FormData) {
  const usuario = await getUsuarioLogado();
  if (!usuario) redirect("/entrar");
  const profileId = parseId(formData.get("profileId"));

  const [perfil] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, usuario.id)));
  if (!perfil) redirect("/quem-e-voce");

  await abrirSessaoPara(usuario.id, perfil.id);
  redirect("/estoque");
}

/* ------------------------------------------------------------------ perfis */

export async function criarPerfil(formData: FormData) {
  const usuario = await getUsuarioLogado();
  if (!usuario) redirect("/entrar");
  const name = parseStr(formData.get("name"));
  if (!name) return;

  await db.insert(profiles).values({ userId: usuario.id, name }).onConflictDoNothing();
  revalidatePath("/perfis");
}

export async function removerPerfil(formData: FormData) {
  const usuario = await getUsuarioLogado();
  if (!usuario) redirect("/entrar");
  const id = parseId(formData.get("id"));

  await db
    .delete(profiles)
    .where(and(eq(profiles.id, id), eq(profiles.userId, usuario.id)));
  // Se o perfil apagado era o ativo na sessão, volta a pedir pra escolher
  // de novo na próxima ação que precisar — mais simples que forçar logout.
  revalidatePath("/perfis");
}

/* ---------------------------------------------------------------- cadastro */

/**
 * Qualquer pessoa pode criar conta — não tem mais convite prévio por
 * email. Em compensação a conta nasce desativada (active: false) e só
 * funciona depois que um admin aprova em Usuários, então não dá pra
 * entrar sem alguém de confiança liberar.
 */
export async function cadastrar(formData: FormData) {
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  const name = parseStr(formData.get("name")) ?? "";
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");
  const codigoRecuperacao = String(formData.get("codigoRecuperacao") ?? "");

  if (!email || !name) redirect("/cadastrar?erro=dados");
  if (senha.length < 6) redirect("/cadastrar?erro=senhaCurta");
  if (senha !== confirmarSenha) redirect("/cadastrar?erro=senhaDiferente");
  if (codigoRecuperacao.length < 4) redirect("/cadastrar?erro=codigoCurto");

  const [existente] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existente) redirect("/cadastrar?erro=jaExiste");

  const [passwordHash, recoveryCodeHash] = await Promise.all([
    hashPassword(senha),
    hashPassword(codigoRecuperacao),
  ]);
  await db
    .insert(users)
    .values({ email, name, passwordHash, recoveryCodeHash, active: false });

  redirect("/entrar?cadastrada=1");
}

/* -------------------------------------------------------- esqueci a senha */

/**
 * Troca a própria senha sabendo email + código de recuperação — sem
 * precisar de admin nem de email de verdade. Só funciona se a conta já
 * tem um código definido (no cadastro, ou por um admin em Usuários).
 */
export async function recuperarSenha(formData: FormData) {
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  const codigo = String(formData.get("codigo") ?? "");
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmarNovaSenha = String(formData.get("confirmarNovaSenha") ?? "");

  if (novaSenha.length < 6) redirect("/esqueci-senha?erro=senhaCurta");
  if (novaSenha !== confirmarNovaSenha) redirect("/esqueci-senha?erro=senhaDiferente");

  const [user] = await db
    .select({ id: users.id, recoveryCodeHash: users.recoveryCodeHash })
    .from(users)
    .where(eq(users.email, email));

  // Confere o código mesmo quando o email não existe ou não tem código
  // definido ainda, contra um hash qualquer — pra não dar mais rápido pra
  // descobrir por tempo de resposta quais emails têm conta.
  const codigoOk = await verifyPassword(codigo, user?.recoveryCodeHash ?? HASH_FALSO);

  if (!user || !user.recoveryCodeHash || !codigoOk) {
    redirect("/esqueci-senha?erro=codigo");
  }

  const passwordHash = await hashPassword(novaSenha);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  redirect("/entrar?recuperada=1");
}

/* -------------------------------------------------------------------- admin */

async function exigirAdmin() {
  const usuario = await getUsuarioLogado();
  if (!usuario?.isAdmin) throw new Error("Só administradores podem fazer isso.");
  return usuario;
}

export async function resetarSenhaUsuario(formData: FormData) {
  await exigirAdmin();
  const id = parseId(formData.get("id"));
  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (novaSenha.length < 6) return;

  const passwordHash = await hashPassword(novaSenha);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  revalidatePath("/admin");
}

export async function definirCodigoRecuperacao(formData: FormData) {
  await exigirAdmin();
  const id = parseId(formData.get("id"));
  const novoCodigo = String(formData.get("novoCodigo") ?? "");
  if (novoCodigo.length < 4) return;

  const recoveryCodeHash = await hashPassword(novoCodigo);
  await db.update(users).set({ recoveryCodeHash }).where(eq(users.id, id));
  revalidatePath("/admin");
}

export async function alternarUsuarioAtivo(formData: FormData) {
  const admin = await exigirAdmin();
  const id = parseId(formData.get("id"));
  if (id === admin.id) return; // não deixa o admin se desativar sem querer

  const [alvo] = await db
    .select({ active: users.active })
    .from(users)
    .where(eq(users.id, id));
  if (!alvo) return;

  await db.update(users).set({ active: !alvo.active }).where(eq(users.id, id));
  revalidatePath("/admin");
}

export async function sair() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/entrar");
}

/* --------------------------------------------------------------- produtos */

export async function criarProduto(formData: FormData) {
  const name = parseStr(formData.get("name"));
  if (!name) return;

  const [created] = await db
    .insert(products)
    .values({
      name,
      unit: parseStr(formData.get("unit")) ?? "un",
      category: parseStr(formData.get("category")),
      cost: parseNum(formData.get("cost")),
      minStock: parseNum(formData.get("minStock")),
    })
    .returning({ id: products.id });

  // Saldo inicial informado no cadastro entra como uma entrada normal,
  // então ele aparece no histórico em vez de surgir do nada.
  const inicial = parseNum(formData.get("initial"));
  if (inicial > 0) {
    await db.insert(stockMoves).values({
      productId: created.id,
      kind: "in",
      qty: inicial,
      unitCost: parseNum(formData.get("cost")) || null,
      note: "Saldo inicial",
    });
  }

  revalidatePath("/estoque");
  revalidatePath("/comprar");
  await registrarAtividade(`cadastrou o insumo "${name}"`);
}

export async function editarProduto(formData: FormData) {
  const id = parseId(formData.get("id"));
  const name = parseStr(formData.get("name"));
  if (!name) return;

  await db
    .update(products)
    .set({
      name,
      unit: parseStr(formData.get("unit")) ?? "un",
      category: parseStr(formData.get("category")),
      cost: parseNum(formData.get("cost")),
      minStock: parseNum(formData.get("minStock")),
    })
    .where(eq(products.id, id));

  revalidatePath("/estoque");
  revalidatePath("/comprar");
  revalidatePath("/servicos");
  await registrarAtividade(`editou o insumo "${name}"`);
}

export async function arquivarProduto(formData: FormData) {
  const id = parseId(formData.get("id"));
  const [produto] = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, id));
  // Arquiva em vez de apagar: o histórico de movimentos continua válido.
  await db.update(products).set({ active: false }).where(eq(products.id, id));
  revalidatePath("/estoque");
  revalidatePath("/comprar");
  await registrarAtividade(`arquivou o insumo "${produto?.name ?? id}"`);
}

/* --------------------------------------------------------------- estoque */

export async function movimentar(formData: FormData) {
  const productId = parseId(formData.get("productId"));
  const kind = String(formData.get("kind"));
  if (kind !== "in" && kind !== "out") throw new Error("Movimento inválido.");

  const quantidade = parseNum(formData.get("qty"));
  if (quantidade <= 0) return;

  const vehicleRaw = parseStr(formData.get("vehicleId"));
  const unitCost = parseNum(formData.get("unitCost"));

  // Na saída, guarda o custo real do lote mais antigo consumido (FIFO) em
  // vez de deixar em branco — é o que faz os relatórios de custo baterem
  // com o que realmente foi pago pelo material que saiu, mesmo depois do
  // preço de referência já ter mudado.
  let custoSaida: number | null = null;
  let produto: { cost: number; name: string } | undefined;
  if (kind === "out") {
    const [historico, [p]] = await Promise.all([
      getMoveHistoryForFifo(productId),
      db
        .select({ cost: products.cost, name: products.name })
        .from(products)
        .where(eq(products.id, productId)),
    ]);
    produto = p;
    custoSaida = fifoCostForNewConsumption(
      historico,
      quantidade,
      produto?.cost ?? 0
    );
  } else {
    const [p] = await db
      .select({ cost: products.cost, name: products.name })
      .from(products)
      .where(eq(products.id, productId));
    produto = p;
  }

  await db.insert(stockMoves).values({
    productId,
    kind,
    qty: quantidade,
    unitCost: kind === "in" ? (unitCost > 0 ? unitCost : null) : custoSaida,
    note: parseStr(formData.get("note")),
    vehicleId: vehicleRaw ? Number(vehicleRaw) : null,
  });

  // Entrada com preço diferente atualiza o preço de referência do insumo,
  // que é o que alimenta a estimativa de custo dos serviços.
  if (kind === "in" && unitCost > 0) {
    await db
      .update(products)
      .set({ cost: unitCost })
      .where(eq(products.id, productId));
  }

  revalidatePath("/estoque");
  revalidatePath("/comprar");
  revalidatePath("/carros");

  const nomeProduto = produto?.name ?? String(productId);
  await registrarAtividade(
    kind === "in"
      ? `deu entrada de ${quantidade} em "${nomeProduto}"`
      : `deu saída de ${quantidade} em "${nomeProduto}"`
  );
}

/* ------------------------------------------------------- tipos de serviço */

export async function criarTipoServico(formData: FormData) {
  const name = parseStr(formData.get("name"));
  if (!name) return;
  await db.insert(serviceTypes).values({
    name,
    notes: parseStr(formData.get("notes")),
  });
  revalidatePath("/servicos");
  revalidatePath("/carros");
}

export async function arquivarTipoServico(formData: FormData) {
  const id = parseId(formData.get("id"));
  await db
    .update(serviceTypes)
    .set({ active: false })
    .where(eq(serviceTypes.id, id));
  revalidatePath("/servicos");
  revalidatePath("/carros");
}

export async function salvarReceitaItem(formData: FormData) {
  const serviceTypeId = parseId(formData.get("serviceTypeId"));
  const productId = parseId(formData.get("productId"));
  const quantidade = parseNum(formData.get("qty"));

  const existing = await db
    .select({ id: serviceTypeItems.id })
    .from(serviceTypeItems)
    .where(
      and(
        eq(serviceTypeItems.serviceTypeId, serviceTypeId),
        eq(serviceTypeItems.productId, productId)
      )
    );

  if (quantidade <= 0) {
    // Quantidade zero significa "tira esse insumo da receita".
    if (existing.length) {
      await db
        .delete(serviceTypeItems)
        .where(eq(serviceTypeItems.id, existing[0].id));
    }
  } else if (existing.length) {
    await db
      .update(serviceTypeItems)
      .set({ qty: quantidade })
      .where(eq(serviceTypeItems.id, existing[0].id));
  } else {
    await db
      .insert(serviceTypeItems)
      .values({ serviceTypeId, productId, qty: quantidade });
  }

  revalidatePath("/servicos");
  revalidatePath("/carros");
}

/* ---------------------------------------------------------------- carros */

export async function criarVeiculo(formData: FormData) {
  const model = parseStr(formData.get("model"));
  if (!model) return;

  const [created] = await db
    .insert(vehicles)
    .values({
      model,
      plate: parseStr(formData.get("plate")),
      customer: parseStr(formData.get("customer")),
      customerPhone: parseStr(formData.get("customerPhone")),
      entryDate: parseStr(formData.get("entryDate")),
      price: parseNum(formData.get("price")),
      photosFolder: parseStr(formData.get("photosFolder")),
      notes: parseStr(formData.get("notes")),
    })
    .returning({ id: vehicles.id });

  revalidatePath("/carros");
  await registrarAtividade(`cadastrou o carro "${model}"`);
  redirect(`/carros/${created.id}`);
}

export async function atualizarVeiculo(formData: FormData) {
  const id = parseId(formData.get("id"));
  const model = parseStr(formData.get("model"));
  if (!model) return;

  await db
    .update(vehicles)
    .set({
      model,
      plate: parseStr(formData.get("plate")),
      customer: parseStr(formData.get("customer")),
      customerPhone: parseStr(formData.get("customerPhone")),
      entryDate: parseStr(formData.get("entryDate")),
      price: parseNum(formData.get("price")),
      photosFolder: parseStr(formData.get("photosFolder")),
      notes: parseStr(formData.get("notes")),
    })
    .where(eq(vehicles.id, id));

  revalidatePath("/carros");
  revalidatePath(`/carros/${id}`);
  await registrarAtividade(`editou o carro "${model}"`);
}

export async function definirStatusVeiculo(formData: FormData) {
  const id = parseId(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["previsto", "andamento", "concluido"].includes(status)) return;

  const [veiculo] = await db
    .select({ model: vehicles.model })
    .from(vehicles)
    .where(eq(vehicles.id, id));
  await db.update(vehicles).set({ status }).where(eq(vehicles.id, id));
  revalidatePath("/carros");
  revalidatePath(`/carros/${id}`);
  await registrarAtividade(
    `mudou o status do carro "${veiculo?.model ?? id}" para ${status}`
  );
}

export async function alternarServico(formData: FormData) {
  const vehicleId = parseId(formData.get("vehicleId"));
  const serviceTypeId = parseId(formData.get("serviceTypeId"));

  const existing = await db
    .select({ id: vehicleServices.id })
    .from(vehicleServices)
    .where(
      and(
        eq(vehicleServices.vehicleId, vehicleId),
        eq(vehicleServices.serviceTypeId, serviceTypeId)
      )
    );

  if (existing.length) {
    await db
      .delete(vehicleServices)
      .where(eq(vehicleServices.id, existing[0].id));
  } else {
    await db.insert(vehicleServices).values({ vehicleId, serviceTypeId });
  }

  revalidatePath("/carros");
  revalidatePath(`/carros/${vehicleId}`);
}

export async function excluirVeiculo(formData: FormData) {
  const id = parseId(formData.get("id"));
  const [veiculo] = await db
    .select({ model: vehicles.model })
    .from(vehicles)
    .where(eq(vehicles.id, id));
  // Solta os movimentos antes, para não perder histórico de estoque.
  await db
    .update(stockMoves)
    .set({ vehicleId: null })
    .where(eq(stockMoves.vehicleId, id));
  await db.delete(vehicles).where(eq(vehicles.id, id));
  revalidatePath("/carros");
  await registrarAtividade(`excluiu o carro "${veiculo?.model ?? id}"`);
  redirect("/carros");
}

/**
 * Baixa de uma vez o material previsto pela receita dos serviços marcados.
 * Continua sendo baixa manual — ela confirma o botão — mas em um clique
 * em vez de um lançamento por insumo.
 */
export async function baixarPrevistos(formData: FormData) {
  const vehicleId = parseId(formData.get("vehicleId"));
  const planned = await getVehiclePlannedItems(vehicleId);
  if (!planned.length) return;

  // Cada insumo aparece uma vez só nessa lista (já vem agrupado), então dá
  // pra calcular o custo FIFO de cada saída direto do histórico de cada um.
  const valores = await Promise.all(
    planned.map((item) => getMoveHistoryForFifo(item.id))
  );

  await db.insert(stockMoves).values(
    planned.map((item, i) => ({
      productId: item.id,
      kind: "out",
      qty: item.qty,
      unitCost: fifoCostForNewConsumption(valores[i], item.qty, item.cost),
      note: "Consumo previsto do serviço",
      vehicleId,
    }))
  );

  revalidatePath("/estoque");
  revalidatePath("/comprar");
  revalidatePath("/carros");
  revalidatePath(`/carros/${vehicleId}`);
  await registrarAtividade(
    `baixou os insumos previstos do carro #${vehicleId}`
  );
}

/**
 * Peça/item avulso comprado à parte pro carro (para-choque, farol,
 * removedor de tinta, calafetagem, colagem de parabrisa...). Não mexe em
 * estoque de insumo — é combinado que peça não tem controle de estoque
 * aqui, só o gasto entra na conta do carro.
 */
export async function adicionarPeca(formData: FormData) {
  const vehicleId = parseId(formData.get("vehicleId"));
  const name = parseStr(formData.get("name"));
  if (!name) return;

  const condition = String(formData.get("condition")) === "recuperada" ? "recuperada" : "nova";
  const estimatedValue = parseNum(formData.get("estimatedValue"));
  const paidValue = parseNum(formData.get("paidValue"));
  const originRaw = String(formData.get("origin") ?? "");
  const origin = ["genuina", "paralela", "usada"].includes(originRaw) ? originRaw : null;

  await db.insert(vehicleParts).values({
    vehicleId,
    name,
    estimatedValue: estimatedValue > 0 ? estimatedValue : null,
    paidValue: paidValue > 0 ? paidValue : null,
    condition,
    origin,
  });

  revalidatePath(`/carros/${vehicleId}`);
  revalidatePath("/carros");
  await registrarAtividade(`adicionou a peça "${name}" no carro #${vehicleId}`);
}

export async function removerPeca(formData: FormData) {
  const id = parseId(formData.get("id"));
  const vehicleId = parseId(formData.get("vehicleId"));
  const [peca] = await db
    .select({ name: vehicleParts.name })
    .from(vehicleParts)
    .where(eq(vehicleParts.id, id));
  await db.delete(vehicleParts).where(eq(vehicleParts.id, id));
  revalidatePath(`/carros/${vehicleId}`);
  revalidatePath("/carros");
  await registrarAtividade(
    `removeu a peça "${peca?.name ?? id}" do carro #${vehicleId}`
  );
}

/* -------------------------------------------------------------- contagem */

export async function abrirContagem() {
  const aberta = await db
    .select({ id: counts.id })
    .from(counts)
    .where(sql`${counts.closedAt} is null`);
  if (aberta.length) {
    revalidatePath("/contagem");
    return;
  }

  await db.insert(counts).values({});
  revalidatePath("/contagem");
}

export async function salvarContagem(formData: FormData) {
  const countId = parseId(formData.get("countId"));
  const lista = await getProducts();

  // Campo vazio = não contou esse item ainda. Diferente de contar zero.
  const linhas = lista
    .map((produto) => {
      const campo = formData.get(`qty_${produto.id}`);
      const vazio = campo === null || String(campo).trim() === "";
      return {
        countId,
        productId: produto.id,
        countedQty: vazio ? null : parseNum(campo),
        systemQty: produto.balance,
      };
    })
    .filter((linha) => linha.countedQty !== null);

  // Se ela apagou um número que já tinha digitado, o item volta a "não contado"
  // e para de gerar ajuste no fechamento.
  const apagados = lista
    .filter((p) => !linhas.some((l) => l.productId === p.id))
    .map((p) => p.id);

  if (apagados.length) {
    await db
      .delete(countItems)
      .where(
        and(
          eq(countItems.countId, countId),
          inArray(countItems.productId, apagados)
        )
      );
  }

  if (linhas.length) {
    // Um único INSERT ... ON CONFLICT: com 200 insumos isso é uma query em vez
    // de 400, e a tela de contagem salva na hora mesmo pelo celular.
    await db
      .insert(countItems)
      .values(linhas)
      .onConflictDoUpdate({
        target: [countItems.countId, countItems.productId],
        set: {
          countedQty: sql`excluded.counted_qty`,
          systemQty: sql`excluded.system_qty`,
        },
      });
  }

  revalidatePath("/contagem");
}

/**
 * Fecha a contagem: para cada item contado, gera um movimento de ajuste
 * com a diferença, para o saldo do sistema passar a bater com a prateleira.
 */
export async function fecharContagem(formData: FormData) {
  const countId = parseId(formData.get("countId"));
  await salvarContagem(formData);

  const lista = await getProducts();
  const saldos = new Map(lista.map((p) => [p.id, p.balance]));
  const custos = new Map(lista.map((p) => [p.id, p.cost]));

  const itens = await db
    .select({
      productId: countItems.productId,
      countedQty: countItems.countedQty,
    })
    .from(countItems)
    .where(eq(countItems.countId, countId));

  const diferencas: { productId: number; diferenca: number }[] = [];
  for (const item of itens) {
    if (item.countedQty === null) continue;
    const sistema = saldos.get(item.productId) ?? 0;
    const diferenca = item.countedQty - sistema;
    // Tolerância para não poluir o histórico com ruído de arredondamento.
    if (Math.abs(diferenca) < 0.001) continue;
    diferencas.push({ productId: item.productId, diferenca });
  }

  // Sumiu estoque (diferença negativa): o ajuste "saiu" do lote mais
  // antigo (FIFO), igual uma saída normal. Achou mais do que o esperado
  // (diferença positiva): não tem lote de compra pra isso, então entra
  // pelo preço de referência atual.
  const historicos = await Promise.all(
    diferencas.map((d) =>
      d.diferenca < 0 ? getMoveHistoryForFifo(d.productId) : null
    )
  );

  const ajustes = diferencas.map(({ productId, diferenca }, i) => ({
    productId,
    kind: "adjust",
    qty: diferenca,
    unitCost:
      diferenca < 0
        ? fifoCostForNewConsumption(
            historicos[i]!,
            -diferenca,
            custos.get(productId) ?? 0
          )
        : custos.get(productId) ?? 0,
    note: `Ajuste da contagem #${countId}`,
  }));

  if (ajustes.length) await db.insert(stockMoves).values(ajustes);

  await db
    .update(counts)
    .set({ closedAt: new Date(), note: parseStr(formData.get("note")) })
    .where(eq(counts.id, countId));

  revalidatePath("/contagem");
  revalidatePath("/estoque");
  revalidatePath("/comprar");
  await registrarAtividade(`fechou a contagem #${countId}`);
}

/**
 * Apaga uma contagem — tanto uma aberta que ela quer cancelar (começou por
 * engano) quanto uma já fechada no histórico. Se já tiver sido fechada e
 * gerado ajustes de estoque, esses ajustes já viraram movimentos normais e
 * continuam no histórico — apagar a contagem não desfaz o estoque, só
 * remove o registro da contagem em si.
 */
export async function excluirContagem(formData: FormData) {
  const id = parseId(formData.get("id"));
  await db.delete(counts).where(eq(counts.id, id));
  revalidatePath("/contagem");
  await registrarAtividade(`apagou a contagem #${id}`);
}

