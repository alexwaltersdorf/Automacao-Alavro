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

### 3.2 Grupo "USG Articulações (MSK)" pausado

Os 12 termos desse grupo (`ultrassom de tendão`, `ultrassom de cotovelo`,
`ultrassom musculoesquelético`, `ultrassom do punho`, `ultrassom do pé`,
`ultrassom de tornozelo`) anunciam exames que **a página de destino não menciona**.

A `/exames/ultrassonografia` lista: abdome (fígado, vesícula, rins, pâncreas),
obstétrico, tireoide, pelve, mama, próstata e Doppler. Musculoesquelético não
aparece.

Pausado em vez de removido — é reversível com uma chamada. **Confirme se a
clínica realiza ultrassom musculoesquelético.** Se sim, o caminho é adicionar a
seção na página e reativar o grupo; se não, ele deve ser removido.

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

**12 anúncios que apontavam para o WhatsApp foram pausados.**

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
| 3 | Confirmar se a clínica faz ultrassom musculoesquelético | operação | define se o grupo MSK volta ou sai |
| 4 | Tirar os 3 termos não-obstétricos da Obstétrica | Google Ads | `ultrassom mamas caraguatatuba`, `ultrassonografia geral caraguatatuba`, `ultrassonografia com doppler` |
| 5 | Consolidar sexagem fetal na Leads-Search-15 | Google Ads | é a única das três que converte, e é exame de sangue |
| 6 | Aplicar o mesmo tratamento à campanha Doppler | Google Ads | mesma estrutura, mesmo URL de WhatsApp, também pausada |
| 7 | Descrever ultrassom de abdome e pelve na página | site | os grupos anunciam exames que a página só cita de passagem |

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
