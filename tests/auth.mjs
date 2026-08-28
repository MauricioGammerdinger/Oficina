/**
 * Testa o fluxo de contas (login por email+senha, convite fechado,
 * cadastro, admin resetando senha de outra conta) — separado do
 * smoke.mjs porque mexe em contas de usuário, não nos dados do negócio.
 *
 * Espera um servidor rodando em BASE_URL com o banco recém-semeado
 * (npm run db:reset && npm run seed) e uma conta admin já criada:
 *
 *   ADMIN_EMAIL="admin@teste.com" ADMIN_NAME="Admin" ADMIN_SENHA="teste123" \
 *     npm run db:criar-admin
 *   npm run test:auth
 *
 * Se DATABASE_URL estiver definida, limpa antes as contas de teste de uma
 * rodada anterior (o db:reset não mexe em contas de usuário de propósito).
 */
import { chromium } from "playwright";
import pg from "pg";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const adminEmail = process.env.ADMIN_EMAIL ?? "admin@teste.com";
const adminSenha = process.env.ADMIN_SENHA ?? "teste123";

// Limpa contas de teste de uma rodada anterior — o db:reset não mexe em
// contas de usuário de propósito (não é dado de negócio), então sem isso
// rodar esse teste duas vezes seguidas ia falhar com "email já existe".
if (process.env.DATABASE_URL) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(
    "delete from users where email in ('cannabis@teste.com', 'intruso@teste.com')"
  );
  await client.query(
    "delete from allowed_signup_emails where email = 'cannabis@teste.com'"
  );
  await client.end();
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
    : {}
);

const log = [];
const ok = (m) => log.push(`OK   ${m}`);
const bad = (m) => log.push(`FAIL ${m}`);

// --- login como admin
const page = await browser.newPage();
await page.goto(`${base}/entrar`);
await page.locator('input[name="email"]').fill(adminEmail);
await page.locator('input[name="senha"]').fill(adminSenha);
await Promise.all([
  page.waitForURL(/\/estoque/),
  page.locator('button:has-text("Entrar")').click(),
]);
ok("login do admin funcionou");

// --- vê o link de admin no menu
await page.goto(`${base}/`);
const linkAdmin = page.locator('a[href="/admin"]');
if (await linkAdmin.count()) ok("link de admin aparece pra admin");
else bad("link de admin não apareceu");

await page.close();

// --- qualquer um pode se cadastrar sem convite prévio, mas a conta nasce
// aguardando aprovação (não loga sozinha)
const page2 = await browser.newPage();
await page2.goto(`${base}/cadastrar`);
await page2.locator('input[name="name"]').fill("Cannabis");
await page2.locator('input[name="email"]').fill("cannabis@teste.com");
await page2.locator('input[name="senha"]').fill("senhadacannabis");
await page2.locator('input[name="confirmarSenha"]').fill("senhadacannabis");
await page2.locator('input[name="codigoRecuperacao"]').fill("codigosecreto");
await Promise.all([
  page2.waitForURL(/\/entrar\?cadastrada=1/),
  page2.locator('button:has-text("Criar conta")').click(),
]);
ok("cadastro sem convite funcionou (e não logou direto)");

// --- tenta logar antes de ser aprovada -> deve barrar com erro=pendente
await page2.locator('input[name="email"]').fill("cannabis@teste.com");
await page2.locator('input[name="senha"]').fill("senhadacannabis");
await Promise.all([
  page2.waitForURL(/erro=pendente/),
  page2.locator('button:has-text("Entrar")').click(),
]);
ok("conta pendente não consegue entrar antes da aprovação");

// --- admin aprova a conta pendente
const pageAdmin2 = await browser.newPage();
await pageAdmin2.goto(`${base}/entrar`);
await pageAdmin2.locator('input[name="email"]').fill(adminEmail);
await pageAdmin2.locator('input[name="senha"]').fill(adminSenha);
await Promise.all([
  pageAdmin2.waitForURL(/\/estoque/),
  pageAdmin2.locator('button:has-text("Entrar")').click(),
]);
await pageAdmin2.goto(`${base}/admin`);
const textoAdmin = await pageAdmin2.locator("main").innerText();
if (
  textoAdmin.toLowerCase().includes("aguardando aprovação") &&
  textoAdmin.includes("cannabis@teste.com")
) {
  ok("conta pendente aparece pro admin aprovar");
} else {
  bad(`seção de pendentes não apareceu como esperado: ${textoAdmin.slice(0, 300)}`);
}
await Promise.all([
  pageAdmin2.waitForLoadState("networkidle"),
  pageAdmin2.locator('button:has-text("Aprovar acesso")').click(),
]);
await pageAdmin2.close();

// --- depois de aprovada, consegue entrar
await page2.goto(`${base}/entrar`);
await page2.locator('input[name="email"]').fill("cannabis@teste.com");
await page2.locator('input[name="senha"]').fill("senhadacannabis");
await Promise.all([
  page2.waitForURL(/\/estoque/),
  page2.locator('button:has-text("Entrar")').click(),
]);
ok("conta aprovada consegue entrar");

// --- vê os MESMOS dados que o admin via (dado compartilhado, não por conta)
await page2.goto(`${base}/estoque`);
const textoEstoque = await page2.locator("main").innerText();
if (textoEstoque.includes("Massa poliéster")) ok("conta nova vê os mesmos dados compartilhados");
else bad("conta nova não vê os dados esperados");

// --- não vê link de admin (não é admin)
const linkAdmin2 = page2.locator('a[href="/admin"]');
if ((await linkAdmin2.count()) === 0) ok("conta comum não vê link de admin");
else bad("conta comum via link de admin (não devia)");

// --- tenta acessar /admin direto -> deve ser redirecionado pra fora
await page2.goto(`${base}/admin`);
await page2.waitForLoadState("networkidle");
if (page2.url().includes("/admin")) bad(`conta comum conseguiu abrir /admin: ${page2.url()}`);
else ok("conta comum não consegue abrir /admin direto");

await page2.close();

// --- admin reseta a senha da cannabis
const page3 = await browser.newPage();
await page3.goto(`${base}/entrar`);
await page3.locator('input[name="email"]').fill(adminEmail);
await page3.locator('input[name="senha"]').fill(adminSenha);
await Promise.all([
  page3.waitForURL(/\/estoque/),
  page3.locator('button:has-text("Entrar")').click(),
]);
await page3.goto(`${base}/admin`);
const linhaCannabis = page3.locator("details", { has: page3.locator("text=cannabis@teste.com") });
await linhaCannabis.locator("summary").click();
await linhaCannabis.locator('input[name="novaSenha"]').fill("senhanovaresetada");
await Promise.all([
  page3.waitForLoadState("networkidle"),
  linhaCannabis.locator('button:has-text("Salvar senha")').click(),
]);
ok("admin resetou a senha de outra conta");
await page3.close();

// --- cannabis loga com a senha antiga -> deve falhar; com a nova -> funciona
const page4 = await browser.newPage();
await page4.goto(`${base}/entrar`);
await page4.locator('input[name="email"]').fill("cannabis@teste.com");
await page4.locator('input[name="senha"]').fill("senhadacannabis");
await Promise.all([
  page4.waitForURL(/erro=1/),
  page4.locator('button:has-text("Entrar")').click(),
]);
ok("senha antiga não funciona mais depois do reset");

await page4.goto(`${base}/entrar`);
await page4.locator('input[name="email"]').fill("cannabis@teste.com");
await page4.locator('input[name="senha"]').fill("senhanovaresetada");
await Promise.all([
  page4.waitForURL(/\/estoque/),
  page4.locator('button:has-text("Entrar")').click(),
]);
ok("senha nova (resetada pelo admin) funciona");
await page4.close();

// --- "esqueci minha senha": email + código de recuperação trocam a senha
// sozinhos, sem passar pelo admin. Usa o código que a Cannabis definiu no
// cadastro ("codigosecreto").
const page5 = await browser.newPage();
await page5.goto(`${base}/esqueci-senha`);
await page5.locator('input[name="email"]').fill("cannabis@teste.com");
await page5.locator('input[name="codigo"]').fill("codigo-errado");
await page5.locator('input[name="novaSenha"]').fill("senhaviaCodigo1");
await page5.locator('input[name="confirmarNovaSenha"]').fill("senhaviaCodigo1");
await Promise.all([
  page5.waitForURL(/erro=codigo/),
  page5.locator('button:has-text("Trocar senha")').click(),
]);
ok("código de recuperação errado é rejeitado");

await page5.goto(`${base}/esqueci-senha`);
await page5.locator('input[name="email"]').fill("cannabis@teste.com");
await page5.locator('input[name="codigo"]').fill("codigosecreto");
await page5.locator('input[name="novaSenha"]').fill("senhaviaCodigo1");
await page5.locator('input[name="confirmarNovaSenha"]').fill("senhaviaCodigo1");
await Promise.all([
  page5.waitForURL(/\/entrar\?recuperada=1/),
  page5.locator('button:has-text("Trocar senha")').click(),
]);
ok("código de recuperação certo troca a senha e volta pro login");

await page5.locator('input[name="email"]').fill("cannabis@teste.com");
await page5.locator('input[name="senha"]').fill("senhaviaCodigo1");
await Promise.all([
  page5.waitForURL(/\/estoque/),
  page5.locator('button:has-text("Entrar")').click(),
]);
ok("login funciona com a senha trocada via código de recuperação");
await page5.close();

// --- perfis: sem nenhum cadastrado, login não pergunta "quem é você"
const page6 = await browser.newPage();
await page6.goto(`${base}/entrar`);
await page6.locator('input[name="email"]').fill("cannabis@teste.com");
await page6.locator('input[name="senha"]').fill("senhaviaCodigo1");
await Promise.all([
  page6.waitForURL(/\/estoque/),
  page6.locator('button:has-text("Entrar")').click(),
]);
ok("sem perfis cadastrados, login vai direto pro estoque");

// --- cadastra dois nomes (Cannabis e Ramon) em /perfis
await page6.goto(`${base}/perfis`);
await page6.locator('input[name="name"]').fill("Cannabis");
await page6.locator('button:has-text("Adicionar")').click();
await page6.locator("text=Cannabis").first().waitFor({ timeout: 10000 });
await page6.goto(`${base}/perfis`);
await page6.locator('input[name="name"]').fill("Ramon");
await page6.locator('button:has-text("Adicionar")').click();
await page6.locator("text=Ramon").first().waitFor({ timeout: 10000 });
await page6.goto(`${base}/perfis`);
const textoPerfis = await page6.locator("main").innerText();
if (textoPerfis.includes("Cannabis") && textoPerfis.includes("Ramon")) {
  ok("os dois nomes aparecem cadastrados em /perfis");
} else {
  bad(`perfis não apareceram como esperado: ${textoPerfis.slice(0, 300)}`);
}
await page6.close();

// --- com 2+ perfis, o próximo login pergunta "quem é você"
const page7 = await browser.newPage();
await page7.goto(`${base}/entrar`);
await page7.locator('input[name="email"]').fill("cannabis@teste.com");
await page7.locator('input[name="senha"]').fill("senhaviaCodigo1");
await Promise.all([
  page7.waitForURL(/\/quem-e-voce/),
  page7.locator('button:has-text("Entrar")').click(),
]);
ok("com 2+ perfis, login pede pra escolher quem é");

await Promise.all([
  page7.waitForURL(/\/estoque/),
  page7.locator('button:has-text("Ramon")').click(),
]);
ok("escolher um perfil segue pro estoque");

// --- uma ação registrada aparece no histórico com o nome do perfil (Ramon)
await page7.goto(`${base}/estoque`);
const linhaHist = page7.locator("summary", { hasText: "Massa poliéster 900g" });
await linhaHist.click();
const blocoHist = page7.locator("details", { has: linhaHist }).first();
await blocoHist.locator('form:has(input[value="in"]) input[name="qty"]').fill("1");
await blocoHist.locator('button:has-text("Lançar entrada")').click();
await page7.waitForTimeout(1500);

await page7.goto(`${base}/historico`);
const textoHistorico = await page7.locator("main").innerText();
if (textoHistorico.includes("Ramon") && textoHistorico.includes("Massa poliéster")) {
  ok("histórico mostra a ação com o nome do perfil (Ramon)");
} else {
  bad(`histórico não mostrou o esperado: ${textoHistorico.slice(0, 400)}`);
}
await page7.close();

console.log(log.join("\n"));
const falhas = log.filter((l) => l.startsWith("FAIL")).length;
console.log(`\n${log.length - falhas} ok, ${falhas} falhas`);
await browser.close();
process.exit(falhas > 0 ? 1 : 0);
