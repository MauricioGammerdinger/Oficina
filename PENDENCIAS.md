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

## 2. Custo de peças no carro — ✅ feito

Vem dos áudios 2, 3, 4 e 11. Quando é serviço de "recuperar e pintar" e troca
uma peça, o valor da peça em si **não** vem do estoque de insumos dela — é
comprada à parte pro carro. Ela respondeu as perguntas de implementação por
escrito (`Pendencias-Controle-da-Oficina.pdf` / `Perguntas-para-Cannabis.pdf`)
e ficou assim:

- [x] Lançamento por carro, peça por peça (com nome de cada uma) — não só
      um valor somado. Nova seção "Peças e itens avulsos" na ficha do carro.
- [x] Guarda valor previsto/orçado separado do valor pago, pra comparar os
      dois.
- [x] Marcar genuína/paralela/usada: ela disse que não precisa ("mta
      coisa") — não implementado, de propósito.
- [x] Nos relatórios/resumo do carro, "Material" e "Peças" aparecem como
      duas linhas separadas, como ela pediu.
- [x] Bônus que ela comentou de graça — remoção de tinta antiga (~R$50 por
      uso), calafetagem, colagem de parabrisa — cabem na mesma lista de
      peças/itens avulsos, cada um só com nome + valor.
- [x] Continua sem controle de estoque de peça — só o gasto entra na conta
      do carro, como combinado.

## 3. Mão de obra por hora, por peça — descartado, ela mesma decidiu

Vem dos áudios 1 e 2. Ela bateu o papo com o pai e decidiu não seguir com
isso: "só as peças gastas e material está bom". Não vira funcionalidade.

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

## 5. Consumo padrão x real de itens não lançados por carro — ✅ feito (a parte que ela pediu)

Vem principalmente do áudio 8 (reforçado por uma frase solta no áudio 4). Ela
respondeu por escrito e confirmou: não quer comparação exata por carro
individual — só uma noção agregada, tipo "quantas lixas pra quantos carros".

- [x] Confirmou que lançar insumo em lote (lixa, massa) sem vincular a um
      carro está bom, e que o relatório "insumos que mais saíram" já
      resolvia a parte agregada — sem precisar criar nada novo aí.
- [x] O que faltava: mostrar, junto com esse relatório, quantos carros
      tiveram material lançado no período e quantas peças foram feitas
      (novas x recuperadas) — pra ela ter a régua pra comparar. Adicionado
      em Relatórios, ao lado de "Insumos que mais saíram".
- [ ] Não implementado (ela não pediu): um número de referência
      cadastrado no sistema tipo "1 lixa por peça, 2 se for capô" — ela deu
      esse contexto pra explicar a régua dela, mas o pedido concreto era só
      a contagem de carros/peças acima. Se um dia ela quiser formalizar
      esse padrão dentro do sistema, é um pedido novo.

## 6. Imprimir a lista de contagem — claro, simples ✅ feito

Vem do áudio 11 (um dos "dois detalhes" que ela disse que ia esquecer se não
falasse na hora).

- [x] Botão "Imprimir lista" na tela de Contagem. No papel só sai insumo +
      saldo do sistema + uma caixinha em branco pra anotar a mão; menu,
      botões e histórico somem.

## Contexto, sem pedido — só pra lembrar

- Áudio 3: ela disse que ia me mostrar depois como lê os orçamentos da
  seguradora e como calculam/enviam os orçamentos deles. Perguntei de novo
  por escrito e ela não lembrava de ter prometido isso e não sabe se pode
  compartilhar um orçamento real — continua em aberto, sem cobrar dela.

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
