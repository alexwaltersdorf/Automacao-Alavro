# Revisão de 7 dias — [TQ] Pesquisa | Ultrassom Modo B

**Data:** 14/09/2026 · **Campanha:** `24117676295` · **Conta:** `920-715-3288`
**Janela medida:** 08/09–12/09/2026 (5 dias com entrega; a campanha foi reativada em 07/09
e 13/09 ainda não fechou no relatório)

---

## O placar

| | Antes (pausada) | 08–12/09 | Δ |
|---|---:|---:|---:|
| Investimento | — | R$ 104,58 | — |
| Cliques | — | 40 | — |
| Conversões | — | 9 | — |
| **CPA** | **R$ 128,83** | **R$ 11,62** | **−91,0%** |
| CPC | R$ 3,00 | R$ 2,61 | −13,0% |

**A reativação funcionou.** O CPA caiu de R$ 128,83 para R$ 11,62 — praticamente uma ordem
de grandeza. A tese central da auditoria de 07/09 (que o problema não era a campanha, e sim
o destino no WhatsApp) se sustenta com dados.

### Onde ela fica na conta, na mesma janela

| Campanha | Investimento | Conv. | CPA |
|---|---:|---:|---:|
| [PQ] [RAIO-X] | R$ 14,27 | 2,0 | **R$ 7,13** |
| [PQ] [HOLTER] | R$ 62,83 | 5,5 | R$ 11,42 |
| **Ultrassom Modo B** | **R$ 104,58** | **9,0** | **R$ 11,62** |
| Leads-Search-15 | R$ 158,29 | 12,0 | R$ 13,19 |
| [PQ] [TOMOGRAFIA] | R$ 69,62 | 4,0 | R$ 17,40 |
| [PQ] [LABORATÓRIO] [MAPS] | R$ 97,86 | 5,0 | R$ 19,57 |
| **Conta inteira** | **R$ 865,05** | **116,0** | **R$ 7,46** |

Modo B entra no meio do pelotão: melhor que Tomografia, MAPS e Leads-15, empatada com a
Holter, atrás da Raio-X. Ainda acima da média da conta (R$ 7,46), então há espaço — e a
seção seguinte mostra exatamente onde.

---

## O problema: `ecocardiograma caraguatatuba`

Nos termos de busca dos últimos 7 dias, a Modo B apareceu para:

| Termo de busca | Investimento | Cliques | Conv. | |
|---|---:|---:|---:|---|
| ultrassom caraguatatuba | R$ 14,63 | 3 | 2 | ✅ |
| **ecocardiograma caraguatatuba** | **R$ 12,59** | **2** | **1** | 🔴 **exame não realizado** |
| clinica de ultrassom caraguatatuba | R$ 9,98 | 1 | 0 | ✅ |
| ultrassom transvaginal com preparo intestinal | R$ 4,46 | 1 | 0 | ✅ |
| clínica de ultrassom em caraguatatuba | R$ 3,31 | 1 | 0 | ✅ |
| onde faz ultrassom perto de mim | R$ 2,96 | 1 | 0 | ✅ |
| **ultrassom obstétrico em caraguatatuba** | R$ 2,52 | 2 | 1 | 🟠 rota errada |
| lugares que fazem ultrassom | R$ 2,29 | 1 | 0 | ✅ |
| total quality caraguatatuba | R$ 2,17 | 1 | 0 | ✅ (marca) |
| quality caraguatatuba | R$ 1,06 | 1 | 0 | ✅ (marca) |
| **ultrassom morfológico** | R$ 0,32 | 1 | 0 | 🟠 deveria estar bloqueado |

**A clínica não realiza ecocardiograma.** É a mesma distinção que motivou o bloco de
negativas cardíacas da campanha de Doppler e o guard-rail `Doppler sim, Doppler cardiaco
nao` no repositório do site. R$ 12,59 em 5 dias — 12% da verba da campanha — foram para um
exame que a clínica não pode entregar. Pior que o dinheiro: **uma pessoa converteu**, ou
seja, entrou em contato pedindo um exame que vai ouvir que não é feito ali.

---

## A causa raiz: negativas sem acento não bloqueiam termos com acento

Lendo as 81 negativas que a Modo B já tinha, o bloco cardíaco existia **pela metade**:

```
eletrocardiograma [BROAD]   ✅ presente
ecodoppler        [BROAD]   ✅ presente
doppler           [BROAD]   ✅ presente
ecocardiograma              ❌ AUSENTE
```

`ecocardiograma` não é bloqueado por `eletrocardiograma` (palavra diferente) nem por
`ecodoppler`. Simples esquecimento na auditoria de 07/09.

Mas os outros dois vazamentos apontam para algo maior. `obstetrico [BROAD]` **estava** na
lista, e ainda assim `ultrassom obstétrico em caraguatatuba` foi servido. `morfologico
[BROAD]` **estava** na lista, e `ultrassom morfológico` foi servido.

O Google documenta que **negativas não pegam variantes aproximadas** — e acento entra
nessa conta. As duas que vazaram são exatamente as duas em que a negativa está sem acento e
a busca vem com acento. Isso não é coincidência: **toda a lista foi escrita sem acento**, o
que deixa inertes as negativas de `carotida`, `gestacao`, `translucencia`, `ressonancia`,
`taubate`, `sao paulo`, `sao jose dos campos`, `de graca`, `gratis`, `bebe`, `salario`,
`veterinaria`, `pre natal` e `o que e`.

O script `scripts/verifica-negativas-google-ads.py` normaliza acentos antes de comparar —
ou seja, **ele simula o Google de forma mais permissiva do que o Google é**. Foi por isso
que a verificação de roteamento de 07/09 deu "20 de 20 corretos" e mesmo assim houve
vazamento. Anotado como limitação conhecida do script.

---

## O que foi aplicado hoje

**30 negativas na campanha `24117676295`**, todas aceitas pelo Google (`Added 30 negative
keyword(s) to campaign 24117676295 successfully`):

**Bloco cardíaco (8)** — o exame que a clínica não realiza:
`ecocardiograma` · `ecocardiografia` · `eco cardiograma` [frase] · `ecocardio` ·
`cardiaco` · `cardíaco` · `cardiologista` · `coracao` · `coração`

**Pares acentuados (22)** — reativam negativas que já existiam mas estavam inertes:
`obstétrico` · `obstétrica` · `morfológico` · `morfológica` · `carótida` · `gestação` ·
`translucência nucal` · `ressonância` · `taubaté` · `são paulo` · `são josé dos campos` ·
`são camilo` · `amor saúde` · `de graça` · `grátis` · `bebê` · `salário` · `veterinária` ·
`veterinário` · `pré natal` · `o que é`

A leitura de volta independente foi bloqueada pelo classificador de permissões desta
sessão, então a confirmação aqui é a resposta da própria API do Google, que devolve a
contagem de itens aceitos.

---

## Duas coisas para o Alex decidir

### 1. A campanha Obstétrica foi pausada — não fui eu

`[TQ] Pesquisa | Ultrassom Obstétrica | Caraguá 40km` (`24112138449`) está **PAUSED**.
Ela entregou em 06/09 (R$ 11,95, 5 cliques) e 07/09 (R$ 13,37, 4 cliques, 1 conversão) e
parou a partir de 08/09. Não foi alteração minha.

Enquanto ela estiver pausada, as negativas obstétricas da Modo B (que acabei de reforçar)
jogam fora busca de gestante sem que ninguém a recolha. Se a pausa foi intencional, faz
sentido **remover** `obstetrico`/`obstétrico` da Modo B e deixá-la atender essa demanda.
Se foi acidental, é reativar a Obstétrica. São caminhos opostos — precisa da sua decisão.

### 2. O orçamento está sendo estourado em 39%

Orçamento de R$ 15/dia, 5 dias = R$ 75 previstos. Gastou **R$ 104,58**. O Google permite
até 2× o diário num dia isolado compensando no mês, e nenhum dia passou de R$ 29,85 — mas a
média de R$ 20,92/dia sustentada indica que a campanha tem demanda acima do orçamento.

Com CPA de R$ 11,62 isso é notícia boa, não ruim: **subir o orçamento para R$ 25/dia**
provavelmente compra mais conversões no mesmo CPA. Não mexi porque aumentar verba é decisão
de caixa, não técnica.

---

## Pendências anteriores que continuam de pé

O conector Windsor voltou a expor **`set_campaign_geo_targeting`**, que não existia em
07/09 — era exatamente o bloqueio que manteve a campanha de Doppler (`24220275336`)
pausada. Agora dá para definir Caraguatatuba + 40 km pela API, sem o painel.

Não apliquei: definir geografia é um passo do caminho para **ativar** a campanha, e ativar
significa começar a gastar. Prefiro que isso seja uma decisão sua, junto com a do orçamento
acima.

| # | Item | Status |
|---|---|---|
| 1 | Geo Caraguatatuba + 40 km na campanha de Doppler | **destravado** — aguarda sua ordem |
| 2 | 28 palavras recusadas por política (9 Modo B, 19 Doppler) | pendente, painel |
| 3 | Remover a campanha Doppler antiga `24112137057` | pendente |
| 4 | Consolidar sexagem fetal na Leads-Search-15 | pendente |
| 5 | Varrer pares acentuados nas outras 5 campanhas com negativas de 07/09 | **novo** — mesma causa raiz |
