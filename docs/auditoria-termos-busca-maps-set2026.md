# Auditoria de termos de busca — conta Google Ads Total Quality (set/2026)

**Fonte:** Google Ads via conector Windsor.ai `google_ads`.
**Conta:** 920-715-3288 — Total Quality [ Caraguatatuba ].
**Janela:** 08/08 a 06/09/2026.
**Escopo:** 15 campanhas, 11 ativas.

> **Correção de uma análise anterior.** A primeira versão deste documento afirmava
> que 59,4% da verba da campanha MAPS ia para termos fora de escopo e propunha
> 76 negativas novas. Estava errado por dois motivos, ambos descobertos ao
> consultar a conta antes de escrever:
>
> 1. **A campanha MAPS já tinha 105 negativas**, e a conta inteira tem mais de
>    1.500 distribuídas em 11 campanhas. A maior parte do gasto que eu classifiquei
>    como desperdício é **anterior** a essas negativas — elas já resolveram o
>    problema. Verificando termo a termo contra as negativas existentes, 39 dos
>    47 piores termos da MAPS **já estão bloqueados**.
> 2. **A clínica oferece exames de imagem.** Existem campanhas dedicadas de
>    Tomografia, Raio-X e três de Ultrassom. Tratar `ultrassom` e `ressonância`
>    como "fora do escopo da clínica" foi leitura errada — eles estão fora do
>    escopo *da campanha de laboratório*, que é onde a negativa já existia.
>
> O desperdício real remanescente é **R$ 246,53 em 30 dias**, não R$ 427,84,
> e a correção certa são 28 negativas, não 76.

## 1. Como a verba se distribui

| Campanha | Status | Gasto 30d |
|---|---|---:|
| [PQ] [LABORATÓRIO] [MAPS] - laboratório caraguatatuba | ATIVA | R$ 1.389,40 |
| Visite o Nosso Laboratório | ATIVA | R$ 940,00 |
| Leads-Search-15 [PQ] [LABORATÓRIO] | ATIVA | R$ 550,71 |
| [PQ] [TOMOGRAFIA] | ATIVA | R$ 399,14 |
| [CARDIOLOGISTA] | ATIVA | R$ 290,97 |
| [PQ] [TOXICOLÓGICO] - Caraguatatuba | ATIVA | R$ 228,67 |
| [PM] [PEDIATRA] [DRA. CYNTHIA] | ATIVA | R$ 217,68 |
| [TQ] Ultrassom Obstétrica | Caraguá 40km | ATIVA | R$ 157,85 |
| [PQ] [MAPA] | ATIVA | R$ 130,75 |
| [TQ] Ultrassom Modo B | Caraguá 40km | PAUSADA | R$ 128,83 |
| [HOLTER] Pesquisa - Leads | ATIVA | R$ 88,59 |
| [PQ] [LABORATÓRIO] | PAUSADA | R$ 43,05 |
| [TQ] Ultrassom Doppler | Caraguá 40km | PAUSADA | R$ 39,49 |
| [PQ] [RAIO-X] | ATIVA | R$ 30,53 |
| [PQ] [ESPIROMETRIA] | ATIVA | R$ 7,40 |

Cobertura de negativas por campanha antes desta auditoria:

| Campanha | Negativas |
|---|---:|
| Visite o Nosso Laboratório | 635 |
| Leads-Search-15 [PQ] [LABORATÓRIO] | 150 |
| [PQ] [RAIO-X] | 129 |
| [PQ] [LABORATÓRIO] (pausada) | 110 |
| [PQ] [LABORATÓRIO] [MAPS] | 105 |
| [PQ] [TOMOGRAFIA] | 98 |
| [PQ] [ESPIROMETRIA] | 98 |
| [PQ] [MAPA] | 96 |
| [PQ] [TOXICOLÓGICO] | 89 |
| [HOLTER] Pesquisa - Leads | 83 |
| [TQ] Ultrassom Obstétrica | 81 |
| **[CARDIOLOGISTA]** | **0** |
| **[PM] [PEDIATRA] [DRA. CYNTHIA]** | **0** |
| [TQ] Ultrassom Modo B (pausada) | 0 |
| [TQ] Ultrassom Doppler (pausada) | 0 |

## 2. Método

Para cada termo de busca com gasto no período, simulei a correspondência contra
as negativas já existentes na campanha, respeitando a semântica do Google:

- **PHRASE** bloqueia quando as palavras da negativa aparecem em sequência no termo;
- **BROAD** bloqueia quando todas as palavras aparecem, em qualquer ordem;
- acentuação é normalizada antes da comparação (`ressonancia` bloqueia `ressonância`);
- negativas **não** casam variantes próximas, então `obstetra` não bloqueia `obstétrico`.

Só entrou na lista de correção o que passou por esse filtro **e** teve gasto sem conversão.

## 3. Os vazamentos reais

### 3.1 Marca própria comprada em 4 campanhas

`total quality caraguatatuba` e variantes consumiram **R$ 58,70 em 30 dias por
1 conversão** — CPA de R$ 58,70 num termo em que a clínica já é 1ª no orgânico
e no Perfil da Empresa:

| Campanha | Gasto | Conv. |
|---|---:|---:|
| Leads-Search-15 [PQ] [LABORATÓRIO] | R$ 28,23 | 1,00 |
| [PQ] [LABORATÓRIO] [MAPS] | R$ 22,07 | 0,00 |
| [HOLTER] Pesquisa - Leads | R$ 5,16 | 0,00 |
| [PQ] [MAPA] | R$ 3,24 | 0,00 |

### 3.2 Marcas de concorrentes que escaparam das negativas existentes

Grafias que as negativas atuais não cobrem: `abslab` (junto — existe só `abs`,
mas não em Leads-Search-15), `amecaragua` (sem espaço), `bioscience` (uma palavra
— existe `bio science`), `laboratoriobellato`, `sys diagnosticos`, `medcenter`
(junto — existe só `med center`), `biotec`, `labexame`, `cipax`, `chromatox`,
e dois nomes de médicos concorrentes: `dr zampa` e `doutor heimar`.

### 3.3 Exames fora do escopo da campanha

`eletroneuromiografia` (R$ 8,09) e `clinica de imagem` (R$ 7,37) na campanha de
laboratório; `ultrassom` (R$ 3,19) na campanha de Holter; `obstetra` (R$ 6,51)
na campanha de Ultrassom Obstétrica — quem busca obstetra quer consulta, não exame.

### 3.4 Fora da área de atendimento

`são josé dos campos` / `sjc` na campanha de Toxicológico (R$ 14,22 — SJC fica a
80 km, serra acima, e tem laboratórios de toxicologia próprios), `ubatuba` na
campanha de Ultrassom Obstétrica, `são sebastião` na MAPS.

## 4. O que foi aplicado

28 negativas, todas em **nível de campanha** (nunca de conta — a conta tem
campanhas legítimas de imagem que seriam prejudicadas), aplicadas via
`push_negative_keywords` do conector `google_ads` em 07/09/2026:

| Campanha | Negativas adicionadas |
|---|---|
| [PQ] [LABORATÓRIO] [MAPS] (12) | `total quality` · `eletroneuromiografia` · `clinica de imagem` · `amecaragua` · `abslab` · `sys diagnosticos` · `retire seu exame` · `biotec` · `labexame` · `laboratoriobellato` · `sao sebastiao` · `bioscience` |
| Leads-Search-15 [PQ] [LABORATÓRIO] (3) | `abslab` · `teste ergometrico` · `bioscience` |
| [HOLTER] Pesquisa - Leads (4) | `total quality` · `dr zampa` · `zampa` · `ultrassom` |
| [PQ] [TOXICOLÓGICO] (3) | `sjc` · `sao jose dos campos` · `cipax` |
| [TQ] Ultrassom Obstétrica (3) | `heimar` · `obstetra` · `ubatuba` |
| [PQ] [MAPA] (3) | `total quality` · `medcenter` · `zampa` |

Confirmadas por leitura de volta na API: 28 de 28 presentes.

Economia estimada: **R$ 150 a R$ 190 por mês**, perdendo no máximo 1 conversão
(a de marca própria na Leads-Search-15, que foi deliberadamente preservada —
ver 5.1). Reversível a qualquer momento via `remove_negative_keywords`.

## 5. Decisões conservadoras — o que deliberadamente NÃO foi bloqueado

### 5.1 Marca própria na Leads-Search-15
É a única das quatro campanhas onde `total quality` converteu. Bloquear nas
quatro deixaria a marca sem nenhuma cobertura paga, e um concorrente que passe a
comprar o nome "Total Quality" apareceria sozinho. Mantida ali como campanha
única de defesa de marca; bloqueada nas outras três.

### 5.2 `hemograma completo` (R$ 21,32, 0 conv)
É o exame mais vendido de um laboratório de análises clínicas. O clique caro
(R$ 21,32 num único clique) é sintoma de correspondência ampla mal calibrada,
não de intenção errada. Bloquear seria desligar o core do negócio. Tratar por
lance e correspondência, não por negativa.

### 5.3 `sexagem fetal` (R$ 14,56 na Leads-Search-15, 0 conv)
Sexagem fetal é exame de sangue materno — serviço legítimo do laboratório, e
converteu na campanha de Ultrassom Obstétrica. Zero conversão aqui é sinal de
página de destino errada, não de termo errado.

### 5.4 `ubatuba` na campanha de Tomografia (R$ 3,75, 0 conv)
Ubatuba tem poucos serviços de tomografia e o paciente pode aceitar deslocamento
para um exame de ticket alto. Um clique sem conversão é evidência fraca demais
para bloquear uma cidade inteira nessa campanha.

### 5.5 Termos informacionais de baixa intenção
`teste de gravidez`, `qual valor do dna na barriga`, `valor do exame de fezes
sangue oculto`, `clinica de exame de sangue gravidez` — são pesquisas de preço e
dúvida sobre exames que a clínica realmente faz. Somam R$ 17,90. O caminho é
conteúdo que responda a dúvida e capture o lead, não negativa.

## 6. O gargalo maior, que negativa nenhuma resolve

Duas campanhas ativas que somam **R$ 508,65 em 30 dias** não têm **nenhuma**
negativa: `[CARDIOLOGISTA]` (R$ 290,97) e `[PM] [PEDIATRA] [DRA. CYNTHIA]`
(R$ 217,68). A API não retorna termos de busca individuais para elas no
período — provavelmente por serem campanhas Performance Max ou Display, que
reportam por canal e não por termo.

São 27% da verba da conta sem visibilidade de termo e sem nenhuma proteção.
Auditá-las exige o relatório de "categorias de pesquisa" no painel do Google Ads,
que a API do Windsor não expõe. **É a próxima frente de trabalho.**

## 7. O que a auditoria diz sobre o SEO orgânico

Os termos que convertem melhor em Ads continuam sendo exatamente os de SoLV 0%
na auditoria 7×7 do Local Pack:

| Termo | Gasto | Conv. | CPA |
|---|---:|---:|---:|
| laboratório caraguatatuba (Leads-Search-15) | R$ 23,51 | 4,00 | R$ 5,88 |
| laboratórios em caraguatatuba (MAPS) | R$ 23,98 | 3,00 | R$ 7,99 |
| laboratórios caraguatatuba (MAPS) | R$ 16,38 | 1,00 | R$ 16,38 |
| laboratório coleta de sangue | R$ 9,04 | 1,00 | R$ 9,04 |
| orçamento de exames laboratoriais | R$ 6,12 | 1,00 | R$ 6,12 |

CPA entre R$ 5,88 e R$ 16,38 — muito abaixo da média da conta. Cada ponto de
SoLV recuperado no orgânico nesses termos reduz diretamente a dependência do
pago. As correções de categoria (`gcid:blood_testing_service`) e de serviços
declarados, em `correcoes-gbp-set2026.md`, atacam o mesmo funil pelo lado orgânico.

## 8. Revisões agendadas

- **13/09/2026** — 7 dias: conferir se os termos bloqueados pararam de gastar
  e se nenhuma conversão foi perdida.
- **06/10/2026** — 30 dias: comparar CPA e volume da janela pós-correção contra
  os R$ 45,01 / 16 conversões da janela auditada.
