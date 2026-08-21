# Pendências e ideias (vindas do uso real)

Lista de pontos que a Cannabis foi reportando enquanto usava o sistema (áudios
transcritos) + o pedido avulso do telefone do cliente. Reli tudo de novo com
calma, ponto por ponto, pra não deixar nada de fora. Isso aqui é só pra não
perder nada — não significa que tudo vai virar funcionalidade, e não tem
prazo. Vou marcando conforme for implementando.

## 1. Telefone do cliente em Carros — claro, simples ✅ feito

- [x] Pedido avulso, direto: "aba pra colocar o nome e o número de telefone
      da cliente". O nome já existia (campo "Cliente"); adicionado o campo
      de telefone junto, no cadastro, na edição e mostrado na ficha do
      carro.

## 2. Custo de peças no carro — claro, tamanho médio

Vem dos áudios 2, 3, 4 e 11. Quando é serviço de "recuperar e pintar" e troca
uma peça, o valor da peça em si **não** vem do estoque de insumos dela — é
comprada à parte pro carro. Hoje isso não entra em lugar nenhum do sistema.
O que ela pediu, juntando os trechos:

- [ ] Um jeito de lançar, por carro, o **valor gasto em peça** — pra entrar
      na conta de material gasto / margem junto com os insumos (áudio 11:
      "no total de material... e as peças, o quanto gastou de peças").
- [ ] Também guardar o **valor previsto/orçado** da peça (particular ou o
      valor total que vem no orçamento da seguradora), pra comparar previsto
      x gasto e ver se teve lucro (áudio 4).
- [ ] Opcional, mas ela distingue bastante isso ao falar: talvez marcar se a
      peça é **genuína, paralela ou usada** — peça usada tem custo extra de
      preparo (removedor, wash primer, funilaria), mas esse custo extra ela
      já sabe lançar como insumo normal, não precisa de campo novo pra isso.
- [ ] Explicitamente NÃO é pra controlar estoque de peça — isso é dos
      estoques separados do pai dela (peças pra usar) e do Rodrigão (peças
      pra vender), cada um no controle deles. Ela só quer o **gasto**
      refletido no carro.

## 3. Mão de obra por hora, por peça — ideia em aberto

Vem dos áudios 1 e 2. Orçamentos de seguradora mostram horas de recuperação
cobradas detalhadas por peça. Ela queria padronizar isso na oficina também.

- [ ] **Não é pedido fechado ainda** — ela disse explicitamente que precisa
      conversar com o pai antes de decidir se/como padronizar isso. Não
      encarar sem confirmar com ela que já bateu esse papo.

## 4. Estoque por lote (FIFO) — ✅ feito

Vem do áudio 7, com exemplo numérico bem específico:

- Ela tinha 2 kg de massa poliéster a R$186 no estoque.
- Comprou mais 4 kg na Bella Tintas a R$180. O sistema jogou os 6 kg
  inteiros pra R$180 (preço mais recente), em vez de manter os 2 kg a R$186
  separados dos 4 kg a R$180.
- Saíram 3 kg pra um carro. Ela queria que a baixa consumisse primeiro o
  lote mais antigo (FIFO): os 2 kg a R$186 + 1 kg a R$180, sobrando 3 kg a
  R$180.
- Comprou mais 3 kg a R$190. O sistema mostra os 6 kg como R$190, mas na
  cabeça dela o estoque real é 3 kg a R$180 + 3 kg a R$190.

- [x] Feito, exatamente conforme o exemplo do áudio: cada entrada guarda o
      próprio preço, e toda saída (manual, baixa de receita ou ajuste de
      contagem que achou falta) desconta o lote mais antigo primeiro. Na
      tela de Estoque, quando um insumo tem mais de um preço no momento, a
      linha mostra "N preços" e, ao abrir, a lista completa (ex.: "6 un
      R$38,00 / 4 un R$41,50"). Os relatórios de custo (material gasto,
      perda em contagem, insumo que mais saiu) passam a usar o preço real
      do lote consumido em vez do preço mais recente — inclusive pro
      histórico já lançado antes dessa mudança, que foi recalculado.

## 5. Consumo padrão x real de itens não lançados por carro

Vem principalmente do áudio 8 (reforçado por uma frase solta no áudio 4).
Reli esse trecho de novo com calma porque na primeira vez passei batido em
um detalhe importante: não é (só) sobre comparar a receita de um serviço com
o que saiu num carro específico — isso já existe e funciona bem. O ponto novo
é outro: tem insumo (lixa, massa) que sai do estoque **em lote pra vários
carros ao mesmo tempo** (ela entrega a caixa de lixa inteira pro time, não
lança quanto foi pra cada carro). Nesses casos ela não consegue saber se o
consumo bateu o esperado olhando carro por carro — o jeito que ela pensa
nisso é agregado: "saíram 100 lixas nesse período, quantos carros passaram,
isso bate com o padrão que eu esperava por carro?"

- [ ] Um lugar pra registrar um **padrão esperado de consumo** (ex.: "cada
      carro recuperado gasta em média X lixas / Y massa"), pra depois
      comparar com o que realmente saiu do estoque num período e o número de
      carros atendidos — ajuda ela a decidir quando e quanto repor.
- [ ] Ela também falou, à parte (áudio 4), em poder "cadastrar insumos
      padrão que eu acho que era pra ter gastado nesse carro" — o que sugere
      que às vezes ela também quer essa comparação por carro individual,
      não só agregada. Vale perguntar direto pra ela qual das duas visões
      (ou as duas) resolve melhor antes de implementar.

## 6. Imprimir a lista de contagem — claro, simples ✅ feito

Vem do áudio 11 (um dos "dois detalhes" que ela disse que ia esquecer se não
falasse na hora).

- [x] Botão "Imprimir lista" na tela de Contagem. No papel só sai insumo +
      saldo do sistema + uma caixinha em branco pra anotar a mão; menu,
      botões e histórico somem.

## Contexto, sem pedido — só pra lembrar

- Áudio 3: ela disse que ia me mostrar depois como lê os orçamentos da
  seguradora e como calculam/enviam os orçamentos deles. Ainda não recebi
  isso — pode ser relevante pros itens 2 e 3 acima quando ela mandar.

## Sem ação necessária (elogios / ela mesma já resolveu)

- Relatórios (faturado, material, margem, comparativo de fornecedor, insumos
  que mais saíram, perda em contagens, estoque mínimo) — aprovado, sem
  mudança pedida.
- "Últimas movimentações" ficar dentro do produto, não numa aba separada —
  ela achou bom do jeito que está (áudios 6 e 9, repetidos).
- Múltiplos estoques (dela / pai / Rodrigão / Adriana) — cada um mantém o
  seu separado (Excel pros outros); não pediu unificação no sistema.
- Fluxo de cor/tinta por carro (caderno do colorista + padrão manual no
  sistema) — já funciona do jeito que ela usa hoje.
