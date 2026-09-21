# Auditoria e reativação — [TQ] Pesquisa | Ultrassom Modo B | Caraguá 40km

**Data:** 07/09/2026 · **Conta:** 920-715-3288 · **Campanha:** `24117676295`
**Status:** pausada → **ATIVA**

> O Planejador de Palavras-chave exige login do Google Ads e não foi acessível.
> Esta auditoria foi construída sobre o histórico da própria conta — que é
> evidência mais forte que estimativa de volume, porque mostra o que já aconteceu
> com dinheiro real nesta cidade, nesta clínica e neste leilão.

---

## 1. Por que a campanha estava pausada — os quatro problemas

### 1.1 🔴 Todos os anúncios apontavam para o WhatsApp, não para o site

Este é o achado central. Cruzando o URL final de todos os grupos de anúncios
da conta:

| Campanha | CPA | URL final |
|---|---:|---|
| [PQ] [RAIO-X] | **R$ 5,09** | `totalquality.med.br/exames/raio-x` |
| [PQ] [MAPA] | R$ 7,72 | `totalquality.med.br/exames/mapa` |
| Leads-Search-15 | R$ 9,65 | `totalquality.med.br/...` |
| [PQ] [HOLTER] | R$ 13,74 | `totalquality.med.br/exames/holter` |
| [PQ] [TOXICOLÓGICO] | R$ 16,24 | `totalquality.med.br/exames/exame-toxicologico` |
| [PQ] [TOMOGRAFIA] | R$ 34,16 | `totalquality.med.br/exames/tomografia-computadorizada` |
| **[TQ] Ultrassom Modo B** | **R$ 128,83** | 🔴 `api.whatsapp.com/send/` — **7 de 7 grupos** |
| [TQ] Ultrassom Doppler | — (0 conv) | 🔴 `api.whatsapp.com/send/` |

**Toda campanha da conta que performa aponta para a sua própria página no site.
As duas que apontavam para o WhatsApp são exatamente as duas que foram pausadas.**

O Google avalia a experiência na página de destino como componente do Índice de
Qualidade. Um domínio que o rastreador não consegue ler, sem conteúdo relacionado
à palavra-chave, tende a pontuar "abaixo da média" — e Índice de Qualidade baixo
se paga em CPC. Modo B pagava **R$ 3,00 por clique**; a Raio-X, com página
própria, paga **R$ 0,71**.

Nota: a campanha de Ultrassom Obstétrica **já foi migrada** para
`/exames/ultrassonografia` — os anúncios de WhatsApp dela estão como `REMOVED`.
A Modo B ficou para trás porque estava pausada quando a migração aconteceu.

### 1.2 🔴 93% da verba em um único grupo de anúncios

Desempenho por grupo, 01/07 a 06/09:

| Grupo | Impressões | Cliques | Gasto | Conv. |
|---|---:|---:|---:|---:|
| **Ultrassom Genérico Local** | 483 | 40 | **R$ 119,98** | 1 |
| USG Próstata | 16 | 1 | R$ 3,48 | 0 |
| USG Mamas | 6 | 1 | R$ 3,38 | 0 |
| USG Abdome Total | 35 | 1 | R$ 1,99 | 0 |
| USG Pelve e Transvaginal | 12 | 0 | R$ 0 | 0 |
| USG Articulações (MSK) | 3 | 0 | R$ 0 | 0 |
| USG Rins e Vias Urinárias | 2 | 0 | R$ 0 | 0 |
| USG Tireoide | 0 | 0 | R$ 0 | 0 |

O grupo genérico levou **R$ 119,98 de R$ 128,83** e 40 dos 43 cliques. Os outros
sete somaram 74 impressões e R$ 8,85 em 68 dias.

A campanha foi segmentada por **anatomia** — mamas, próstata, tireoide, rins,
articulações. Cada grupo ficou com 2 a 8 palavras de cauda muito longa, sem
volume para sair do lugar, enquanto as palavras amplas do grupo genérico
(`exame de ultrassom`, `ultrassom caraguatatuba`) absorviam toda a demanda.

**Comparação com o que funciona na conta:** a `[PQ] [TOXICOLÓGICO]` tem 5 grupos
segmentados por **intenção** — LOCAL, PREÇO, CNH/DETRAN, CLÍNICA/LABORATÓRIO —
com 8 a 11 palavras cada, e **todos os cinco recebem tráfego**. A `[PQ] [RAIO-X]`
usa um único grupo com 24 palavras e tipos de correspondência misturados,
incluindo EXATA nos termos que convertem: CPA de R$ 5,09 com 61,6% de impressões.

### 1.3 🔴 Zero palavras-chave negativas

Confirmado por leitura da API: a campanha tinha **nenhuma** negativa, nem em
nível de campanha nem de grupo. Os termos de busca que ela pagou mostram o
resultado:

| Termo | Gasto | Conv. | Problema |
|---|---:|---:|---|
| ultrassom caraguatatuba | R$ 17,18 | 0 | (canibalizava a Obstétrica) |
| telefone multimagem caraguatatuba | R$ 6,94 | 0 | marca de concorrente |
| ultrassom morfológica 3d preço | R$ 6,76 | 0 | obstétrico — outra campanha |
| ultrassom são josé dos campos | R$ 3,43 | 0 | 80 km fora do raio |
| multimagem caraguatatuba | R$ 2,30 | 0 | marca de concorrente |
| preparo ultrassom abdome total | R$ 1,99 | 0 | intenção informacional |
| clinica de ultrassom ubatuba | R$ 0,80 | 0 | fora do raio de 40 km |
| ultrassom ubatuba | R$ 0,78 | 0 | fora do raio de 40 km |

### 1.4 🔴 Sem CPA-alvo definido

Todas as campanhas de busca da conta têm CPA-alvo: Raio-X R$ 5,78,
Espirometria R$ 5,46, Holter R$ 13,88, MAPA R$ 15,00, MAPS R$ 18,00,
Tomografia R$ 20,84. **A Modo B tinha o campo vazio** — o lance automático
rodava sem teto de referência, o que explica o CPC de R$ 3,00 num leilão em
que a Raio-X compra a R$ 0,71.

---

## 2. Canibalização com a Ultrassom Obstétrica — confirmada

Cruzando os IDs de critério das duas campanhas, **seis palavras eram literalmente
a mesma**, disputando o mesmo leilão com a mesma conta:

| Palavra | Correspondência | Modo B | Obstétrica |
|---|---|:---:|:---:|
| `ultrassom caraguatatuba` | AMPLA | ✅ | ✅ |
| `ultrassom caraguatatuba` | FRASE | ✅ | ✅ |
| `ultrassom caraguatatuba` | EXATA | — | ✅ |
| `ultrassonografia caraguatatuba` | FRASE | ✅ | ✅ |
| `clínica de ultrassom` | AMPLA | ✅ | ✅ |
| `clínica de ultrassom` | FRASE | ✅ | ✅ |

> `clínica de ultrassom` e `clinica de ultrassom` são a mesma palavra-chave — o
> Google normaliza acentuação antes de comparar.

### O que a Obstétrica guarda e não deveria

Três termos na Obstétrica não são obstétricos e pertencem a outras campanhas:

| Palavra | Grupo | Onde deveria estar |
|---|---|---|
| `ultrassom mamas caraguatatuba` | USG Obstétrico Geral | Modo B — mama não é exame obstétrico |
| `ultrassonografia geral caraguatatuba` | USG Obstétrico Geral | Modo B — termo genérico |
| `ultrassonografia com doppler` | USG Obstétrico Geral | Ultrassom Doppler |

**Não foram removidos.** A instrução era não incluí-los na Modo B, e foi isso que
se fez — mas eles seguem fazendo a Obstétrica aparecer para buscas que ela não
atende, o que derruba CTR e Índice de Qualidade dela. Fica como recomendação.

### Sexagem fetal está em três campanhas ao mesmo tempo

| Onde | Gasto | Conv. |
|---|---:|---:|
| Leads-Search-15 → grupo "Exames \| Sexagem Fetal" | R$ 42,04 | **4** |
| Ultrassom Obstétrica → grupo "Sexagem Fetal" | R$ 20,23 | 0 |
| `[TQ] Pesquisa \| Sexagem Fetal` (campanha própria, pausada) | R$ 0 | 0 |

Só a primeira converte — e faz sentido, porque sexagem fetal é **exame de sangue**,
não ultrassom, e a Leads-Search-15 manda para `/exames/exames-de-sangue`.
Recomendação: manter apenas ali e remover o grupo da Obstétrica.

---

## 3. O que foi executado

### 3.1 Palavras removidas da Modo B (8)

| Palavra | Motivo |
|---|---|
| `ultrassom caraguatatuba` (AMPLA, FRASE) | duplicada na Obstétrica |
| `ultrassonografia caraguatatuba` (FRASE) | duplicada na Obstétrica |
| `clínica de ultrassom` (AMPLA, FRASE) | duplicada na Obstétrica |
| `ultrassom ubatuba` (AMPLA, FRASE) | ~50 km, fora do raio de 40 km |
| `ultrassom ilhabela` (FRASE) | exige travessia de balsa |

`ultrassom são sebastião` foi **mantida** — 22 km, dentro do raio, sem balsa.

### 3.2 Grupo "USG Articulações (MSK)" — pausado e depois reativado

Os 12 termos desse grupo (`ultrassom de tendão`, `ultrassom de cotovelo`,
`ultrassom musculoesquelético`, `ultrassom do punho`, `ultrassom do pé`,
`ultrassom de tornozelo`) anunciam exames que **a página de destino não menciona**.

A `/exames/ultrassonografia` lista, na seção "Indicações": abdome (fígado,
vesícula, rins, pâncreas), obstétrico, tireoide, pelve, mama, próstata e Doppler.
Musculoesquelético não aparece.

O grupo foi pausado por precaução e **reativado em seguida**, depois de a clínica
confirmar que realiza todos os tipos de ultrassom. Recebeu anúncio próprio
apontando para a página (`823810161829`).

⚠️ **Fica uma lacuna de conteúdo:** a página de destino segue sem citar ultrassom
musculoesquelético. Anunciar um exame que a página não descreve é exatamente o
problema de relevância que esta auditoria corrigiu no resto da campanha. A
correção é uma linha na seção "Indicações" — ver §5, item 7.

### 3.3 65 palavras negativas adicionadas (a campanha tinha zero)

**Bloco 1 — proteção entre campanhas (20).** Impede a Modo B de roubar o tráfego
da Obstétrica e do Doppler:
`gestante` · `gravidez` · `gestacional` · `gestacao` · `obstetrico` · `obstetrica` ·
`morfologico` · `morfologica` · `translucencia nucal` · `sexagem` · `pre natal` ·
`semanas` · `bebe` · `feto` · `fetal` · `3d` · `4d` · `doppler` · `ecodoppler` · `carotida`

**Bloco 2 — concorrentes e fora de área (20):**
`multimagem` · `multi imagem` · `tomocenter` · `bellato` · `humanize` · `duclin` ·
`abs` · `abslab` · `oswaldo cruz` · `sao camilo` · `med center` · `medcenter` ·
`amor saude` · `ame caragua` · `santa casa` · `ubatuba` · `sjc` ·
`sao jose dos campos` · `taubate` · `sao paulo`

**Bloco 3 — outras modalidades e ruído (25):**
`tomografia` · `ressonancia` · `raio x` · `raiox` · `mamografia` · `densitometria` ·
`endoscopia` · `colonoscopia` · `eletrocardiograma` · `veterinario` · `veterinaria` ·
`pet` · `cachorro` · `gato` · `gratis` · `de graca` · `sus` · `curso` · `emprego` ·
`vaga` · `faculdade` · `salario` · `apostila` · `o que e` · `como funciona`

### 3.4 Palavras novas — 10 aceitas, 9 recusadas pelo Google

Aceitas:

| Grupo | Palavras |
|---|---|
| Ultrassom Genérico Local | `quanto custa ultrassom` · `valor do ultrassom` · `ultrassom no mesmo dia` · `ultrassom urgente` · `clinica de imagem caragua` |
| USG Abdome Total | `ultrassom de figado` · `ultrassom abdome superior` |
| USG Mamas | `ultrassom mamario` · `usg de mamas` |
| USG Próstata | `ultrassom prostatico` |

Nenhuma delas colide com termo da Obstétrica.

**Recusadas com erro de política (9):** `ultrassom preço`, `ultrassom particular
caraguatatuba`, `ultrassom com laudo`, `ultrassom abdome total`, `ultrassom
abdominal`, `usg abdome total`, `ultrassom de vesicula`, `ultrassonografia
mamaria`, `ultrassom de mama`, `ultrassom de rins`, `ultrassom renal`, `usg rins`,
`ultrassom rins e vias urinarias`, `ultrassom de prostata`, `ultrassom prostata`.

O conector devolve apenas "A policy was violated" — **não expõe o
`PolicyViolationDetails`**, então a política específica não pode ser lida daqui.
São termos clínicos comuns e várias delas já existem na conta em outras grafias,
o que torna o motivo genuinamente incerto. Precisa ser visto na interface do
Google Ads, que mostra a política citada e permite pedir isenção.

### 3.5 Anúncios migrados para o site

6 novos anúncios responsivos criados apontando para
`https://totalquality.med.br/exames/ultrassonografia`, um por grupo ativo:

| Grupo | ID do anúncio |
|---|---|
| Ultrassom Genérico Local | `823888455491` |
| USG Abdome Total | `823809888919` |
| USG Mamas | `823888484042` |
| USG Pelve e Transvaginal | `823888502561` |
| USG Próstata | `823888485317` |
| USG Rins e Vias Urinárias | `823765713990` |

| USG Articulações (MSK) | `823810161829` |

**Extensão a toda a conta.** Confirmado pela clínica que ela realiza todos os
tipos de ultrassom, as demais campanhas de ultrassom também foram migradas:

| Campanha | Grupo | Novo anúncio | Destino |
|---|---|---|---|
| [TQ] Ultrassom Doppler | Doppler Genérico | `823765990719` | `/exames/ultrassonografia` |
| [TQ] Ultrassom Obstétrica | Sexagem Fetal | `823810203037` | `/exames/exames-de-sangue` |

A Sexagem Fetal foi a única exceção ao destino único, e por um motivo clínico:
**sexagem fetal é exame de sangue materno, não ultrassom.** Mandá-la para a página
de ultrassonografia recriaria a incompatibilidade que esta auditoria eliminou. Ela
foi apontada para `/exames/exames-de-sangue`, que é o destino do grupo "Exames |
Sexagem Fetal" da Leads-Search-15 — o único dos três que converte (4 conversões).

**20 anúncios que apontavam para o WhatsApp foram pausados.**

### Resultado: zero anúncios no WhatsApp

Verificado por leitura de volta na API: **nenhum anúncio ativo da conta aponta
mais para `wa.me` ou `api.whatsapp.com`.** Todos os anúncios habilitados das 15
campanhas apontam para uma página em `totalquality.med.br`.

O CTA de WhatsApp continua existindo — agora dentro da página, que é onde o Google
consegue ler o contexto e pontuar a experiência de destino.

Os textos seguem a Resolução CFM 2.336/2023: identificam a clínica e o endereço,
não prometem nem insinuam resultado, não usam superlativo de superioridade e não
apelam ao sensacionalismo. O CTA de WhatsApp continua existindo — agora **dentro
da página**, que é onde o Google consegue ler o contexto.

### 3.6 Lance e orçamento

| Parâmetro | Antes | Agora |
|---|---|---|
| Estratégia | Maximizar conversões, **sem CPA-alvo** | Maximizar conversões |
| CPA-alvo | — | **R$ 20,00** |
| Orçamento diário | (não legível pela API) | **R$ 15,00** |

O CPA-alvo de R$ 20,00 fica entre a Raio-X (R$ 5,78) e a Tomografia (R$ 20,84),
que é onde o ultrassom se posiciona por ticket. O orçamento de R$ 15/dia é
deliberadamente contido para um recomeço — a campanha inteira gastou R$ 128,83
em 68 dias. **Ambos são uma chamada de API para ajustar.**

### 3.7 Campanha ativada

`campaign_status: ENABLED`, confirmado por leitura de volta.

---

## 4. Estrutura final

| Grupo | Status | Palavras | URL final |
|---|---|---:|---|
| Ultrassom Genérico Local | ativo | 17 | `/exames/ultrassonografia` |
| USG Abdome Total | ativo | 8 | `/exames/ultrassonografia` |
| USG Mamas | ativo | 9 | `/exames/ultrassonografia` |
| USG Pelve e Transvaginal | ativo | 8 | `/exames/ultrassonografia` |
| USG Próstata | ativo | 3 | `/exames/ultrassonografia` |
| USG Rins e Vias Urinárias | ativo | 2 | `/exames/ultrassonografia` |
| USG Articulações (MSK) | **pausado** | 12 | — |
| USG Tireoide | ativo, **sem palavras** | 0 | — |

Negativas de campanha: **65**. CPA-alvo: **R$ 20,00**. Orçamento: **R$ 15/dia**.

---

## 5. O que ficou pendente

| # | Item | Onde | Por quê |
|---|---|---|---|
| 1 | Adicionar as 9 palavras recusadas | Google Ads (interface) | a API não expõe a política citada; a interface mostra e permite pedir isenção |
| 2 | Popular o grupo "USG Tireoide" | Google Ads | o grupo existe vazio; a API não retornou o ID dele por nunca ter tido dados. A tireoide está na página de destino |
| 3 | Tirar os 3 termos não-obstétricos da Obstétrica | Google Ads | `ultrassom mamas caraguatatuba`, `ultrassonografia geral caraguatatuba`, `ultrassonografia com doppler` |
| 4 | Consolidar sexagem fetal na Leads-Search-15 | Google Ads | é a única das três que converte, e é exame de sangue |
| 5 | Decidir se a campanha Doppler volta ao ar | Google Ads | anúncios já migrados para o site; segue pausada |
| 6 | Citar sexagem fetal na página de exames de sangue | site | nenhuma das duas páginas menciona o exame, e três campanhas gastam com ele |
| 7 | **Ampliar a seção "Indicações" da página de ultrassonografia** | site | ver abaixo |

### Item 7 — o que falta na página de destino

Agora que **todas** as campanhas de ultrassom apontam para
`/exames/ultrassonografia`, a seção "Indicações" precisa cobrir tudo o que se
anuncia. Hoje ela lista sete itens; faltam os exames dos grupos que voltaram:

| Anunciado | Está na página? |
|---|---|
| Abdome (fígado, vesícula, rins, pâncreas) | ✅ |
| Obstétrico | ✅ |
| Tireoide | ✅ |
| Pelve | ✅ |
| Mama | ✅ |
| Próstata | ✅ |
| Doppler (vascular) | ✅ |
| **Musculoesquelético** (ombro, joelho, punho, cotovelo, tornozelo, pé, tendão) | ❌ |
| **Transvaginal** (ginecológico, fora do contexto obstétrico) | ❌ |

São duas linhas na lista de indicações e, idealmente, uma linha de preparo para
cada. O arquivo fica no repositório `alexwaltersdorf/total-quality`, em
`server/_core/seo-content.ts`.

---

## 6. Como medir se funcionou

Revisar em **14/09** (7 dias) e **21/09** (14 dias). O que observar, em ordem:

1. **CPC.** É o indicador mais rápido do efeito da página de destino. Sai de
   R$ 3,00; se a hipótese estiver certa, deve cair para a faixa de R$ 1,00–1,50
   em duas semanas, conforme o Índice de Qualidade recalibra.
2. **Distribuição entre grupos.** Se "Ultrassom Genérico Local" continuar com
   mais de 80% do gasto, a segmentação por anatomia não vai vingar e o caminho é
   consolidar em 2 ou 3 grupos por intenção, como na Toxicológico.
3. **Termos de busca.** Confirmar que nenhum termo obstétrico aparece — se
   aparecer, falta negativa.
4. **Impressões da Obstétrica.** Não devem cair. Se caírem, a Modo B está
   roubando tráfego e é preciso apertar as negativas cruzadas.
5. **CPA.** Só a partir de ~15 conversões o lance automático tem sinal
   suficiente. Antes disso, o CPA vai oscilar muito — não reagir a ele.

Se em 14 dias o CPC não tiver cedido, a causa não era a página de destino, e o
próximo suspeito é a concorrência no leilão de "ultrassom" em Caraguatatuba —
que se resolve com lance, não com estrutura.

---

## Adendo — 07/09/2026: os genéricos `ultrassonografia` e `usg`

A clínica observou que os dois termos aparecem nas pesquisas e pediu para
incluí-los nas campanhas de ultrassom.

### O problema de colocá-los "nas campanhas", no plural

São termos genéricos. Adicioná-los às três campanhas de ultrassom faria as três
disputarem a mesma busca com a mesma conta — a canibalização que esta auditoria
passou o dia eliminando, e que já custou caro em `ultrassom caraguatatuba` (§2).

### A solução: genérico em uma campanha, específico nas outras

Os genéricos entram **só na Modo B**, que é a campanha geral de ultrassom. As
negativas cruzadas que ela já tem fazem o roteamento sozinhas: uma busca genérica
fica; uma busca específica é bloqueada ali e sobra para a campanha certa.

| Campanha | Palavras adicionadas |
|---|---|
| **Modo B** — Ultrassom Genérico Local | `ultrassonografia` (frase + ampla) · `usg` (frase + ampla) · `fazer ultrassonografia` · `usg caraguatatuba` · `ultrassonografia particular` |
| **Obstétrica** — USG Obstétrico Geral | `usg obstetrico` · `usg obstetrica` · `ultrassonografia obstetrica` · `usg gestacional` · `ultrassonografia gestacional` |
| **Doppler** — Doppler Rins e Geral | `usg com doppler` · `ultrassonografia com doppler` |

14 de 16 aceitas. Recusadas por política: `usg doppler` e `ultrassonografia doppler`.

Removidas da Obstétrica: `ultrassonografia com doppler` (ampla e frase) — estava
na campanha obstétrica anunciando exame de outra, e agora existe na campanha de
Doppler, onde é o lugar dela.

### Verificação do roteamento

Simulando a correspondência das 65 negativas da Modo B contra 20 buscas reais
possíveis, com o script `scripts/verifica-negativas-google-ads.py`:

| Busca | Deve ir para | Modo B |
|---|---|---|
| `usg` | Modo B | serve ✅ |
| `ultrassonografia` | Modo B | serve ✅ |
| `usg de tireoide` | Modo B | serve ✅ |
| `ultrassonografia de abdome` | Modo B | serve ✅ |
| `usg obstetrico` | Obstétrica | bloqueada por `obstetrico` ✅ |
| `usg gestacional` | Obstétrica | bloqueada por `gestacional` ✅ |
| `ultrassonografia de gravidez` | Obstétrica | bloqueada por `gravidez` ✅ |
| `usg com doppler` | Doppler | bloqueada por `doppler` ✅ |
| `usg doppler carotidas` | Doppler | bloqueada por `doppler` ✅ |
| `usg ubatuba` | nenhuma | bloqueada por `ubatuba` ✅ |
| `curso de ultrassonografia` | nenhuma | bloqueada por `curso` ✅ |
| `usg veterinaria` | nenhuma | bloqueada por `veterinaria` ✅ |

**20 de 20 corretos.** Nenhuma das três campanhas rouba busca das outras, e o
ruído (curso, SUS, veterinária, fora de área) continua barrado.

### O que observar na revisão de 14/09

Estes dois termos são os mais amplos da campanha. São também os que mais podem
trazer busca fora de escopo. Na revisão, o primeiro relatório a abrir é o de
termos de busca do grupo "Ultrassom Genérico Local": se aparecer algo obstétrico,
de Doppler ou de outra modalidade, falta negativa e é prioridade sobre qualquer
ajuste de lance.

---

# Revisão de 7 dias — 14/09/2026

Resposta item a item ao checklist definido em 07/09. O detalhamento do vazamento
e da causa raiz está em `docs/revisao-7dias-ultrassom-modo-b.md`; aqui fica o
placar contra o que foi previsto.

## 1. CPC — a hipótese estava errada

**Previsto:** R$ 3,00 → R$ 1,00–1,50 com a migração do WhatsApp para
`/exames/ultrassonografia`.
**Real:** R$ 3,00 → **R$ 2,61** (−13,0%).

A previsão não se confirmou. A comparação com a Raio-X (R$ 0,71 com página
própria) sugeriu que o destino era o fator dominante do CPC; ele ajudou, mas
muito menos do que eu projetei.

A explicação está na seção 2: a verba concentrou-se em `ultrassom caraguatatuba`
e `clinica de ultrassom caraguatatuba` — cabeça de cauda, disputada por toda
clínica da região. Um único clique em `clinica de ultrassom caraguatatuba` custou
R$ 9,98. A Raio-X paga R$ 0,71 porque tem pouca concorrência local, não só porque
tem página. Comparei campanhas que não são comparáveis nesse aspecto.

## 2. Distribuição entre grupos — a segmentação por anatomia não vingou

| Grupo de anúncios | Investimento | % | Cliques | Impr. | Conv. |
|---|---:|---:|---:|---:|---:|
| **Ultrassom Genérico Local** | **R$ 95,87** | **78,7%** | 33 | 402 | **9** |
| USG Rins e Vias Urinárias | R$ 14,32 | 11,8% | 10 | 113 | 0 |
| USG Abdome Total | R$ 9,74 | 8,0% | 3 | 34 | 0 |
| USG Mamas | R$ 1,58 | 1,3% | 2 | 11 | 0 |
| USG Articulações (MSK) | R$ 0,23 | 0,2% | 1 | 24 | 0 |
| USG Pelve e Transvaginal | R$ 0,00 | 0,0% | 0 | 5 | 0 |
| USG Próstata | R$ 0,00 | 0,0% | 0 | 0 | 0 |
| USG Tireoide | R$ 0,00 | 0,0% | 0 | 0 | 0 |

O gatilho definiu o corte em 80%. Deu **78,7%** — passou raspando, e a
concentração caiu de 93% para 78,7%. Mas o número de corte é o menos importante
aqui:

**O grupo genérico entregou as 9 conversões. Os sete grupos de anatomia
entregaram zero, somando R$ 25,87 e 16 cliques.**

Isso é mais forte do que o critério pedia. Não é só que a verba se concentra: é
que a segmentação por anatomia **não produz**. Três dos oito grupos não tiveram
uma única impressão em sete dias.

**Recomendação:** consolidar por intenção, como na Toxicológico — que roda quatro
grupos (Local, Preço, CNH/DETRAN, Clínica/Laboratório) e distribui verba entre
eles de fato. A tradução para ultrassom seria algo como "Local", "Preço",
"Perto de Mim" e "Modalidade Específica", com os oito grupos anatômicos fundidos
no último. Não apliquei: é reestruturação, não ajuste, e merece decisão sua.

## 3. Termos de busca — apareceu obstétrico, e apareceu coisa pior

Apareceu `ultrassom obstétrico em caraguatatuba` (R$ 2,52) e `ultrassom
morfológico` (R$ 0,32), apesar de `obstetrico` e `morfologico` já estarem na lista
de negativas. E apareceu **`ecocardiograma caraguatatuba`** (R$ 12,59, 1
conversão), exame que a clínica não realiza.

Causa raiz: **negativas do Google não pegam variantes acentuadas**, e a lista
inteira foi escrita sem acento. Detalhado em
`docs/revisao-7dias-ultrassom-modo-b.md`.

Corrigido: **30 negativas aplicadas** na campanha (8 do bloco cardíaco, 22 pares
acentuados). Conforme o próprio checklist mandava, isso teve prioridade sobre
qualquer ajuste de lance.

## 4. Impressões da Obstétrica — caíram, mas não foi a Modo B

**A campanha `24112138449` está PAUSED.** Entregou em 06/09 (R$ 11,95, 5 cliques)
e 07/09 (R$ 13,37, 4 cliques, 1 conversão) e parou a partir de 08/09. Nos 7 dias
somou 8 impressões em dois grupos; os outros três zeraram.

O critério do checklist ("as impressões não devem cair, senão a Modo B está
roubando tráfego") deu resultado ruim, mas **por outro motivo**: a queda é a
pausa, não canibalização. Não foi alteração minha.

Enquanto ela estiver pausada, as negativas obstétricas da Modo B — que acabei de
reforçar com as versões acentuadas — jogam fora busca de gestante sem que ninguém
a recolha. Se a pausa foi intencional, o certo é **remover** `obstetrico` e
`obstétrico` da Modo B; se foi acidental, é reativar a Obstétrica.

## 5. CPA — abaixo do volume mínimo para reagir

9 conversões, contra o piso de ~15 definido no checklist. **CPA de R$ 11,62**
(5 dias completos, 08–12/09), contra R$ 128,83 antes da pausa.

O número é excelente, mas 9 conversões ainda é pouco para tratar como estável.
Conforme combinado, **não mexi no lance** — o CPA-alvo segue em R$ 20,00.

## Placar do checklist

| # | Item | Previsto | Real | |
|---|---|---|---|---|
| 1 | CPC | R$ 1,00–1,50 | R$ 2,61 | ❌ hipótese errada |
| 2 | Concentração no grupo genérico | < 80% | 78,7% — mas com 100% das conversões | ⚠️ passou no número, falhou no mérito |
| 3 | Termos obstétricos | nenhum | apareceram, mais um cardíaco | ❌ corrigido |
| 4 | Impressões da Obstétrica | estáveis | colapsaram (campanha pausada) | ⚠️ outra causa |
| 5 | CPA | não reagir < 15 conv. | 9 conv., R$ 11,62 | ✅ não reagi |

A campanha está entregando muito acima do que entregava. Dos cinco itens, os dois
que apontam trabalho real são o **2** (estrutura por intenção) e o **4** (decidir
o que fazer com a Obstétrica) — ambos aguardando decisão sua.

---

# Segunda revisão de 7 dias — 14 a 20/09/2026

Vencida desde 21/09, destravada quando o conector Windsor voltou. Dados puxados
em 21/09 às 08:00 UTC, conta 920-715-3288, campanha `24117676295`.

## Os quatro pontos do checklist

### 1. Vazamento: **resolvido** ✅

Nenhum termo de busca da Modo B com `ecocardiograma`, `obstétrico`,
`morfológico`, `ecodoppler` ou variação. As 30 negativas de 14/09 fecharam o
buraco — inclusive as acentuadas, que eram o que o meu script de verificação
não pegava.

Os únicos termos proibidos que aparecem na conta inteira estão na campanha
**HOLTER (`23957223102`)**: `ecodopplercardiograma`,
`ecocardiografia transtorácica` e `econorte ecocardiografia caraguatatuba` —
os três com **0 cliques e R$ 0,00**. São impressões sem custo, mas indicam que
aquela campanha precisa das mesmas negativas que a Modo B recebeu.

### 2. CPA: **piorou muito** ❌

| | Revisão anterior | Agora (14–20/09) |
|---|---|---|
| Conversões | 9 | **3** |
| Gasto | — | R$ 118,37 |
| **CPA** | **R$ 11,62** | **R$ 39,46** |
| CPC médio | R$ 2,61 | R$ 3,04 |
| Cliques | — | 39 |
| Impressões | — | 251 (36/dia) |

O CPA triplicou e as conversões caíram para um terço. Quatro dos sete dias
fecharam com **zero** conversão.

### 3. Orçamento: **melhorou, ainda estoura** ⚠️

R$ 118,37 em 7 dias = **R$ 16,91/dia** contra R$ 15/dia definidos. Estouro de
**12,7%**, contra os 39% da revisão anterior (~R$ 20,90/dia).

### 4. Obstétrica `24112138449`: **PAUSED** ✅

Confirmado. Também seguem pausadas a Doppler `24112137057`, a Sexagem Fetal
`24169249335` e a `[TQ] Ultrassom com Doppler` `24220275336`.

## O achado que explica o CPA: a campanha não está comprando ultrassom

**Zero cliques em termos de ultrassom nos 7 dias.** Nenhum.

Os termos de ultrassom aparecem só como impressão — `ultrassom caraguatatuba`
(12 impressões), `ultrassom` (11), `usg transvaginal com preparo intestinal`
(4), `transvaginal` (3), `ultrassonografia` (3), `ultrassom transvaginal` (3) —
e **não recebem clique nenhum**.

Os cliques pagos vão todos para outra coisa:

| Termo | Cliques | Gasto | Conv | Natureza |
|---|---|---|---|---|
| clínica mais próxima de mim | 8 | R$ 12,59 | 1 | genérico |
| clinicas medicas em caraguatatuba | 1 | R$ 7,19 | 0 | genérico |
| **uroproct caraguatatuba** | 2 | R$ 5,66 | 0 | **concorrente** |
| **total quality caraguatatuba** | 2 | R$ 5,59 | 0 | **marca própria** |
| **central med** | 1 | R$ 5,40 | 0 | **concorrente** |
| clinicas caraguatatuba | 1 | R$ 4,63 | 1 | genérico |
| **laboratório mastellini caraguatatuba** | 1 | R$ 2,86 | 0 | **concorrente** |
| **quality caraguatatuba** | 1 | R$ 2,34 | 0 | **marca própria** |
| clinica caraguatatuba | 1 | R$ 1,33 | 0 | genérico |
| exames de imagem caraguatatuba | 1 | R$ 0,95 | 0 | genérico |

Somando: **R$ 13,92 em marca de concorrente** e **R$ 7,93 em marca própria** —
R$ 21,85, ou 45% do gasto visível, com **zero conversões**.

Pagar por `total quality caraguatatuba` é o pior dos dois: quem digita o nome
da clínica ia chegar de graça pelo orgânico ou pelo perfil do Google.

E ainda há impressão em mais concorrentes sem clique: `amed caraguatatuba`,
`clinica neon caraguatatuba`, `doma radiologia caraguatatuba`,
`clínica eco norte caraguatatuba`, `estela maris caraguatatuba`,
`clinica sumaré caraguatatuba`, `clínica beira mar caraguatatuba`,
`dr heimar martins caraguatatuba`, `hospital regional de caraguatatuba`.

### Ressalva de cobertura

Os termos acima somam R$ 48,54 dos R$ 118,37 gastos — **41%**. O Google não
divulga termos de baixo volume, então 59% do gasto está em buscas que não dá
para auditar. A conclusão vale para o que é visível; o resto é presunção
razoável, não medição.

## Leitura

As negativas de 14/09 consertaram o problema que tinham de consertar: a
campanha parou de comprar exames que a clínica não faz. Mas elas não
resolveram — e nem podiam — o problema de fundo: **a correspondência ampla
continua traduzindo "ultrassom" em "clínica em Caraguatatuba"**, e é nisso que
o dinheiro está indo.

O CPA de R$ 39,46 não é sinal de que o ultrassom não converte. É sinal de que
a campanha quase não anuncia ultrassom para quem busca ultrassom.

## Recomendações, nenhuma aplicada

Nada foi alterado na conta. Em ordem de impacto:

1. **Negativar marca própria e concorrentes na Modo B** — `total quality`,
   `quality caraguatatuba`, `uroproct`, `central med`, `mastellini`, `amed`,
   `neon`, `doma radiologia`, `eco norte`, `estela maris`, `sumaré`,
   `beira mar`, `heimar`, `hospital regional`. Devolve ~R$ 22 por semana de
   gasto sem retorno. **Atenção às acentuadas:** negativa sem acento não bloqueia
   termo com acento, foi o que já nos custou caro em 14/09.
2. **Negativar o genérico de clínica** — `clínica mais próxima de mim`,
   `clinicas caraguatatuba`, `clinicas medicas`. Converteu 2 em 11 cliques, mas
   é demanda que a campanha de laboratório já cobre mais barato.
3. **Rever a correspondência das palavras-chave.** Se depois de negativar o
   volume cair a quase nada, a resposta não é alargar de novo: é que não há
   busca de ultrassom suficiente em Caraguá para sustentar R$ 15/dia — e aí a
   decisão é de orçamento, não de palavra-chave.
4. **Aplicar as negativas de ecocardiograma na campanha HOLTER**, que hoje tem
   impressão em três termos do exame que a clínica não realiza.


---

## Aplicado em 21/09/2026 — palavras-chave de `ultrassonografia`

A pedido do Alex, no grupo **Ultrassom Genérico Local** (`205841632544`) da
Modo B (`24117676295`):

| Palavra | Tipo | Criterion ID | Resultado |
|---|---|---|---|
| `ultrassonografia` | EXATA | `2372560910` | ✅ adicionada |
| `ultrassonografia caraguatatuba` | FRASE | `2419844594076` | ✅ adicionada |
| `ultrassonografia em caraguatatuba` | FRASE | — | ❌ recusada pelo Google |

A recusa veio como *"A policy was violated. See PolicyViolationDetails"*. O
Windsor não expõe o detalhe da violação, então **não sei o motivo** — e não vou
inventar um. O que dá para afirmar é que não é o termo em si: a variante sem o
"em" passou no mesmo lote.

**A recusa não abre buraco de cobertura.** Desde 2021 a correspondência de
frase do Google casa consultas com palavras inseridas no meio, desde que o
sentido se mantenha — `"ultrassonografia caraguatatuba"` cobre a busca
"ultrassonografia em caraguatatuba". A terceira palavra era redundante na
prática.

### Por que essas e não as que foram pedidas ao pé da letra

`ultrassonografia` e `usg` **já estavam cadastradas** na Modo B antes deste
pedido — `ultrassonografia` em AMPLA e FRASE, `usg` em AMPLA e FRASE, mais
`usg caraguatatuba`, `clinica de ultrassonografia`, `fazer ultrassonografia` e
`ultrassonografia particular`. Reincluí-las seria duplicata.

O que faltava era **controle**: `ultrassonografia` só tinha tração em AMPLA, e
é justamente ela que o Google vinha traduzindo em `uroproct caraguatatuba`,
`central med` e `clínica mais próxima de mim`. A EXATA dá um caminho que não
depende da ampla; `ultrassonografia caraguatatuba` traz a intenção local, que
até então existia **apenas na campanha Obstétrica, pausada**.

### O que continua sem ser aplicado

As negativas de marca própria e de concorrente da revisão acima. Sem elas, a
ampla segue levando ~R$ 22/semana para busca que não é de ultrassom.
