# Controle da Oficina

[![CI](https://github.com/SEU-USUARIO/oficina/actions/workflows/ci.yml/badge.svg)](https://github.com/SEU-USUARIO/oficina/actions/workflows/ci.yml)

> Troque `SEU-USUARIO/oficina` pelo caminho do repositório para o selo acima
> funcionar.

Sistema simples de **estoque** e **checklist de carros** para oficina de
funilaria e pintura. Feito para substituir a planilha: cadastro de insumos com
estoque de segurança, alerta de compra automático, e ficha por carro que
responde na hora se o serviço compensa.

## O que ele faz

| Tela          | Para quê                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------- |
| **Estoque**   | Todos os insumos com saldo, mínimo e preço. Entrada e saída em dois cliques na própria linha. |
| **Comprar**   | Só o que está no ou abaixo do mínimo, com quanto comprar e o custo estimado.              |
| **Carros**    | Carros da semana com valor cobrado, checklist de serviços e a conta cobrado − material = sobra. |
| **Contagem**  | Inventário físico. Ao fechar, acerta o saldo do sistema e mostra o quanto sumiu.          |
| **Serviços**  | A receita de cada tipo de serviço: quanto de cada insumo ele consome.                     |
| **Relatórios**| Faturado, material gasto e margem (carros concluídos), gasto em compras por mês, preço por fornecedor, insumos que mais saíram e perda encontrada nas contagens. |
| **Config**    | E-mail que recebe o alerta diário de compras, liga/desliga o alerta, botão de testar.     |

### Alerta de compras por e-mail

Uma vez por dia (tarefa agendada da Vercel) o sistema confere a lista de
compras e, se tiver algo no mínimo, manda um e-mail. O e-mail de destino e se
o alerta está ligado ficam guardados no banco e são configurados na tela
**Config** — cada pessoa que usa o sistema aponta o próprio e-mail ali, sem
mexer em variável de ambiente nenhuma. Veja "Publicando de graça" abaixo para
o que precisa ser configurado uma vez no servidor (a chave do Resend).

### Comparar preço entre fornecedores

Na tela **Relatórios**, quando um insumo já foi comprado de mais de um lugar,
aparece uma comparação de preço entre esses lugares — o mais barato fica
destacado. Não existe cadastro de fornecedor separado: é só o campo "onde
comprou" que já existe na entrada de estoque (tela Estoque). Quanto mais isso
for preenchido nas compras do dia a dia, mais insumo aparece na comparação.

### Como as telas se conectam

A peça central é a **receita de serviço** (tela Serviços). Você cadastra uma vez
que "pintura de uma peça" gasta 0,3 de primer, 0,25 L de base, 2 lixas 400, e
assim por diante. A partir disso:

1. No carro, você marca os serviços do checklist → o sistema soma o material
   previsto e mostra a margem antes de o carro entrar na oficina;
2. Um botão dá baixa de todo esse material de uma vez, como saída ligada
   àquele carro;
3. A contagem física corrige o que o dia a dia comeu sem ninguém anotar.

Sem a receita cadastrada o sistema ainda funciona, mas o custo de material de
cada carro fica zero — então vale investir meia hora nessa tela no começo.

### O que ele deliberadamente NÃO faz

- **Não importa XML de nota fiscal.** Boa parte das compras é de vendedor
  ambulante ou Mercado Livre e nunca vira nota; e importar XML criava produtos
  duplicados com nomes iguais e preços diferentes, o que bugava a baixa. Entrada
  é manual e leva 5 segundos.
- **Não guarda fotos.** As fotos de check-in continuam no PC. Cada carro tem um
  campo para anotar o caminho da pasta.
- **Não controla mão de obra nem hora de serviço.** Só material.
- **Não tem múltiplos usuários.** Uma senha só, uma pessoa.

## Rodando local

Precisa de Node 20+ e um Postgres.

```bash
npm install
cp .env.example .env.local     # e preencha as três variáveis
npm run db:migrate             # cria as tabelas
npm run seed                   # insumos e receitas de exemplo (opcional)
npm run dev                    # http://localhost:3000
```

O `.env` precisa de:

```
DATABASE_URL=postgresql://usuario:senha@host:5432/oficina
APP_PASSWORD=a-senha-de-acesso
AUTH_SECRET=string-longa-aleatoria     # openssl rand -hex 32
```

As variáveis do alerta por e-mail (`RESEND_API_KEY`, `ALERT_EMAIL_FROM`,
`CRON_SECRET`) são opcionais em dev — sem elas o alerta simplesmente avisa que
falta configuração, sem quebrar nada. Veja `.env.example`.

Comandos úteis:

```bash
npm run db:generate   # gera migração depois de mudar src/db/schema.ts
npm run db:migrate    # aplica as migrações
npm run db:studio     # navegador de tabelas do Drizzle
npm run db:reset      # APAGA todos os dados (só em dev)
```

## Publicando de graça

O projeto foi feito para caber no free tier. Dois passos:

**1. Banco — [Neon](https://neon.tech) ou [Supabase](https://supabase.com)**

Crie um projeto, escolha a região mais perto (`sa-east-1` / São Paulo), copie a
connection string. No Neon, use a string com `?sslmode=require`.

**2. App — [Vercel](https://vercel.com)**

```bash
npx vercel        # ou conecte o repositório no painel
```

Configure as três variáveis de ambiente no painel da Vercel, e rode a migração
uma vez apontando para o banco de produção:

```bash
DATABASE_URL="a-string-do-neon" npm run db:migrate
```

Pronto. A mesma URL abre no computador e no celular — é uma aplicação
responsiva, não precisa instalar app nenhum.

**3. Alerta por e-mail (opcional) — [Resend](https://resend.com)**

Crie uma conta gratuita, gere uma API key em *API Keys*, e adicione na Vercel:

```
RESEND_API_KEY=a-chave-do-resend
CRON_SECRET=string-longa-aleatoria     # openssl rand -hex 32, protege a rota do alerta
```

`ALERT_EMAIL_FROM` é opcional — sem preencher, usa o remetente padrão do
Resend (`onboarding@resend.dev`), que não exige verificar domínio. O e-mail
de destino não vai aqui: cada pessoa configura o próprio na tela **Config**
dentro do site, com um botão para testar na hora. A tarefa agendada
(`vercel.json`) roda uma vez por dia — no free tier da Vercel não dá pra
rodar mais de uma vez ao dia.

**4. Ambiente separado para você testar (opcional, mas recomendado)**

Antes de mexer no que ela usa de verdade, vale ter um segundo ambiente só seu,
com banco próprio, para testar sem risco:

1. Crie um **segundo projeto no Neon** (ex.: `oficina-dev`) — igual ao
   primeiro, mas vazio.
2. No seu computador, aponte o `.env.local` para essa string de conexão nova
   e use uma `APP_PASSWORD` diferente da dela (ex.: `teste123`). Rode
   `npm run db:migrate` e `npm run seed` nesse banco novo. Daqui pra frente,
   `npm run dev` no seu PC sempre bate nesse banco de teste, nunca no dela.
3. Se quiser um link também (não só local), crie um **segundo projeto na
   Vercel** apontando pro mesmo repositório do GitHub, com suas próprias
   variáveis de ambiente (`DATABASE_URL` do banco de teste, sua própria
   `APP_PASSWORD`). Fica com uma URL diferente (ex.:
   `oficina-dev.vercel.app`), sem tocar no projeto de produção dela.

Como cada ambiente já tem seu próprio banco e sua própria senha, isso já
resolve a separação: o login dela continua sendo o dela, e o seu vira uma
senha diferente que só existe no ambiente de teste — sem o sistema precisar
saber que existem "dois usuários", porque na prática são dois sistemas
inteiros, independentes.

## Decisões técnicas que valem saber

**O saldo nunca é uma coluna.** Ele é sempre `soma(entradas) − soma(saídas) +
soma(ajustes)`, calculado na hora. Se um lançamento der errado, o histórico
continua sendo a fonte da verdade e nada fica "torto" para sempre. Com o volume
de uma oficina isso custa milissegundos.

**Ajuste de contagem é um movimento, não uma sobrescrita.** Fechar uma contagem
gera um movimento do tip`adjust` com a diferença. Assim você consegue olhar para
trás e ver quanto material desapareceu em cada mês — que é uma informação útil
para conversar com quem pega as coisas sem avisar.

**Entrada com preço atualiza o preço de referência do insumo.** É o que mantém a
estimativa de custo dos carros perto da realidade sem ninguém ter que revisar
tabela de preço.

**Sem estado no cliente.** As telas usam `<details>` nativo e Server Actions.
Carrega rápido em celular ruim e não tem tela em branco esperando JavaScript.

**Arquiva, não apaga.** Insumos e tipos de serviço são desativados, para não
quebrar o histórico de movimentos que já aponta para eles.

## Checagem automática (GitHub Actions)

Todo push e todo pull request rodam `.github/workflows/ci.yml`, em duas frentes:

**Lint, tipos e build** — ESLint, `tsc --noEmit` e o build de produção. Não
precisa de banco: todas as telas são dinâmicas, nada é gerado no build.

**Teste de fumaça no navegador** — sobe um Postgres de verdade, aplica as
migrações, roda o seed, sobe a aplicação e passa um Chromium por 21 verificações
dos fluxos reais: login e rota protegida, entrada de estoque somando o saldo e
atualizando o preço de referência, busca, item entrando na lista de compras,
cadastro de carro, checklist calculando a margem, baixa do material previsto
derrubando o saldo, contagem física ajustando o estoque, layout no celular e
logout. Se algum passo quebrar, o commit fica com o X vermelho.

Os prints das telas geradas no teste ficam salvos como artefato da execução — dá
para abrir e ver como a interface estava naquele commit.

Para rodar o mesmo teste localmente, com a aplicação já no ar:

```bash
npm run db:reset && npm run seed
npm run test:smoke
```

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind 4 ·
Drizzle ORM · Postgres

## Estrutura

```
src/
  app/
    actions.ts          todas as Server Actions
    entrar/             login
    (app)/              telas protegidas
      estoque/  comprar/  carros/  contagem/  servicos/
  components/           nav e linha do estoque
  db/                   schema e conexão
  lib/                  queries SQL, auth, formatação
scripts/                seed e reset
drizzle/                migrações geradas
```
