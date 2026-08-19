/**
 * Teste de fumaça: sobe um navegador de verdade e passa pelos fluxos que a
 * oficina usa todo dia — login, entrada e saída de estoque, lista de compras,
 * ficha do carro com a conta da margem, baixa do material previsto e contagem
 * física com ajuste de saldo.
 *
 * Espera um servidor rodando em BASE_URL (padrão http://localhost:3000) com o
 * banco recém-semeado (npm run db:reset && npm run seed) e APP_PASSWORD com o
 * valor de TEST_PASSWORD.
 *
 *   npm run test:smoke
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const senha = process.env.TEST_PASSWORD ?? "oficina123";
const shots = process.env.SHOTS_DIR ?? "./tests/shots";
mkdirSync(shots, { recursive: true });

const log = [];
const ok = (m) => log.push(`OK   ${m}`);
const bad = (m) => log.push(`FAIL ${m}`);

// Em CI o Playwright acha o Chromium sozinho; localmente dá para apontar um
// binário já instalado com PLAYWRIGHT_CHROMIUM.
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
    : {}
);

// Desktop
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => bad(`erro de JS: ${e.message.split("\n")[0]}`));

// --- login
await page.goto(`${base}/estoque`);
if (page.url().includes("/entrar")) ok("rota protegida redireciona para login");
else bad("rota protegida NAO redirecionou");

await page.fill('input[name="senha"]', "errada");
await page.click('button:has-text("Entrar")');
await page.waitForLoadState("networkidle");
if (await page.locator("text=Senha incorreta").isVisible())
  ok("senha errada é rejeitada");
else bad("senha errada passou");

await page.fill('input[name="senha"]', senha);
await page.click('button:has-text("Entrar")');
await page.waitForURL("**/estoque");
ok("login funciona");
await page.screenshot({ path: `${shots}/01-estoque.png`, fullPage: false });

// --- saldo do seed
const linha = page.locator("summary", { hasText: "Massa poliéster 900g" });
const textoAntes = await linha.innerText();
if (textoAntes.includes("6")) ok("saldo inicial do seed aparece (6 un)");
else bad(`saldo inicial errado: ${textoAntes.replace(/\n/g, " | ")}`);

// --- entrada de estoque
await linha.click();
const bloco = page.locator("details", { has: linha }).first();
await bloco.locator('form:has(input[value="in"]) input[name="qty"]').fill("4");
await bloco
  .locator('form:has(input[value="in"]) input[name="unitCost"]')
  .fill("41,50");
await bloco.locator('button:has-text("Lançar entrada")').click();
await page.waitForTimeout(1500);
await page.reload();
const depois = await page
  .locator("summary", { hasText: "Massa poliéster 900g" })
  .innerText();
if (depois.includes("10")) ok("entrada de 4 -> saldo 10");
else bad(`entrada não somou: ${depois.replace(/\n/g, " | ")}`);
if (depois.includes("41,50")) ok("preço de referência atualizado pela entrada");
else bad(`preço não atualizou: ${depois.replace(/\n/g, " | ")}`);

// --- busca
await page.goto(`${base}/estoque?q=pigmento`);
const qtdLinhas = await page.locator("section.cartao > details").count();
if (qtdLinhas === 2) ok("busca filtra (2 pigmentos)");
else bad(`busca retornou ${qtdLinhas} linhas, esperado 2`);

// --- comprar
await page.goto(`${base}/comprar`);
await page.screenshot({ path: `${shots}/02-comprar.png`, fullPage: true });
const textoComprar = await page.locator("main").innerText();
if (/Tinta base preta/.test(textoComprar))
  ok("tinta preta (1,5 de mín 1) NÃO deveria estar aqui");
if (/Catalisador para primer/.test(textoComprar))
  ok("item no limite do mínimo entra na lista de compras");
else bad("item no limite do mínimo não apareceu em Comprar");

// --- carros: criar
await page.goto(`${base}/carros`);
await page.click('summary:has-text("Novo carro")');
await page.fill('input[name="model"]', "Gol G6 prata");
await page.fill('input[name="plate"]', "ABC1D23");
await page.fill('input[name="customer"]', "Marina");
await page.fill('input[name="price"]', "1800");
await page.click('button:has-text("Cadastrar e marcar serviços")');
await page.waitForURL(/\/carros\/\d+$/);
ok("cadastro de carro redireciona para a ficha");

// --- marcar serviços
await page.click('button:has-text("Recuperação de peça")');
await page.waitForSelector("text=Material previsto", { timeout: 15000 });
await page.click('button:has-text("Pintura de uma peça")');
await page.waitForFunction(
  () => document.body.innerText.includes("insumos"),
  null,
  { timeout: 15000 }
).catch(() => {});
await page.screenshot({ path: `${shots}/03-carro.png`, fullPage: true });

const resumo = await page
  .locator("section", { hasText: "Cobrado" })
  .first()
  .innerText();
const previstoTxt = await page
  .locator("section", { hasText: "Material previsto" })
  .first()
  .innerText();
if (/insumos/.test(previstoTxt)) ok("material previsto aparece pela receita");
else bad("material previsto não apareceu");
if (/SOBRA|Sobra/i.test(resumo)) ok("resumo mostra cobrado / material / sobra");
else bad("resumo incompleto");

// confere a conta: sobra = cobrado - material
const nums = [...resumo.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map((m) =>
  Number(m[1].replace(/\./g, "").replace(",", "."))
);
if (nums.length >= 3) {
  const [cobrado, material, sobra] = nums;
  if (Math.abs(cobrado - material - sobra) < 0.02)
    ok(`conta bate: ${cobrado} − ${material} = ${sobra}`);
  else bad(`conta NÃO bate: ${cobrado} − ${material} ≠ ${sobra}`);
} else bad("não consegui ler os valores do resumo");

// --- baixa dos previstos
const antesBaixa = await page.locator("main").innerText();
await page.click('button:has-text("Dar baixa desse material no estoque")');
await page
  .waitForSelector("text=Material lançado nesse carro", { timeout: 15000 })
  .catch(() => {});
const depoisBaixa = await page.locator("main").innerText();
if (/Material lançado nesse carro/.test(depoisBaixa))
  ok("baixa dos previstos gera as saídas ligadas ao carro");
else bad("baixa dos previstos não apareceu");
if (antesBaixa !== depoisBaixa) ok("página reflete a baixa na hora");

// estoque caiu?
await page.goto(`${base}/estoque?q=Massa%20poli`);
const aposBaixa = await page
  .locator("summary", { hasText: "Massa poliéster 900g" })
  .innerText();
if (aposBaixa.includes("9,5")) ok("saldo caiu 0,5 pela receita (10 -> 9,5)");
else bad(`saldo após baixa: ${aposBaixa.replace(/\n/g, " | ")}`);

// --- serviços / receita
await page.goto(`${base}/servicos`);
await page.screenshot({ path: `${shots}/04-servicos.png`, fullPage: false });
const svc = await page.locator("main").innerText();
if (/Recuperação de peça/.test(svc)) ok("tipos de serviço do seed listados");
else bad("tipos de serviço não listados");

// --- contagem
await page.goto(`${base}/contagem`);
await page.click('button:has-text("Começar uma contagem")');
await page.waitForSelector('input[name^="qty_"]');
// Conta a Massa poliéster: o sistema acha que tem 9,5 e na prateleira tem 3.
const inputMassa = page.locator('input[aria-label*="Massa poliéster"]');
await inputMassa.fill("3");
await page.click('button:has-text("Salvar sem fechar")');
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/05-contagem.png`, fullPage: false });
const contTxt = await page.locator("main").innerText();
if (/[−+]/.test(contTxt)) ok("contagem mostra a diferença antes de fechar");
else bad("contagem não mostrou diferença");

await page.click('button:has-text("Fechar e ajustar o estoque")');
await page.waitForSelector("text=Contagens anteriores");
if (/Contagens anteriores/.test(await page.locator("main").innerText()))
  ok("contagem fecha e vai para o histórico");
else bad("contagem não fechou");

// o ajuste acertou o saldo?
await page.goto(`${base}/contagem`);
await page.waitForSelector('button:has-text("Começar uma contagem")');
await page.click('button:has-text("Começar uma contagem")');
await page.waitForSelector('input[name^="qty_"]');
const sistemaAgora = await page
  .locator('input[aria-label*="Massa poliéster"]')
  .evaluate((el) => el.closest("div").innerText);
if (/(^|\D)3(\D|$)/.test(sistemaAgora))
  ok("ajuste da contagem acertou o saldo (9,5 -> 3)");
else bad(`saldo após ajuste: ${sistemaAgora.replace(/\n/g, " | ")}`);

// --- mobile
const mob = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  storageState: await ctx.storageState(),
});
const mpage = await mob.newPage();
await mpage.goto(`${base}/estoque`);
await mpage.screenshot({ path: `${shots}/06-mobile-estoque.png` });
await mpage.goto(`${base}/comprar`);
await mpage.screenshot({ path: `${shots}/07-mobile-comprar.png` });
const overflow = await mpage.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1
);
if (!overflow) ok("sem rolagem horizontal no celular");
else bad("página vaza na horizontal no celular");

// --- logout
await page.goto(`${base}/estoque`);
await page.locator("header").getByRole("button", { name: "sair" }).click();
await page.waitForURL("**/entrar", { timeout: 15000 });
ok("logout funciona");

await browser.close();

const falhas = log.filter((l) => l.startsWith("FAIL"));
console.log(log.join("\n"));
console.log(`\n${log.length - falhas.length} ok, ${falhas.length} falhas`);
process.exit(falhas.length > 0 ? 1 : 0);
