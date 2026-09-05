# Evolução no Local Pack — palavras-chave prioritárias

Leitura de 05/09/2026, feita direto na API do Local Falcon (`api.localfalcon.com/v1`).
Perfil: `ChIJl9cmhfhjzZQRANUzZnnRLF8` — Total Quality, R. Padre Anchieta 1010, Caraguatatuba.

---

## Antes dos números: 120 dos 155 relatórios não são do Google

A conta tem 155 relatórios. Só **35 medem o Google Local Pack**. Os outros 120 medem
visibilidade em assistentes de IA — um produto diferente do Local Falcon:

| `platform` | Relatórios | O que mede |
|---|---:|---|
| `google` | 35 | posição no mapa do Google (Local Pack) |
| `aimode` | 24 | AI Mode do Google |
| `chatgpt` | 24 | ChatGPT |
| `gemini` | 24 | Gemini |
| `grok` | 24 | Grok |
| `gaio` | 24 | GAIO |

Isso importa porque o endpoint de listagem **mapeia o campo `saiv` (Share of AI Voice) para
`solv`**. Quem ler a lista sem filtrar por `platform` vê o mesmo termo, no mesmo minuto,
com SoLV 0% e 100% ao mesmo tempo — e conclui qualquer coisa. Os 100% eram o ChatGPT citando
a clínica, não o mapa do Google.

**Regra: filtrar `platform == "google"` antes de qualquer leitura de Local Pack.**

---

## A evolução, por palavra-chave

Todos os scans abaixo são `platform: google`. ARP menor é melhor (1 = primeiro lugar);
SoLV maior é melhor.

### 1. "laboratório caraguatatuba" — grade 5×5, raio 10 km

| Data | ARP | SoLV | Encontrado |
|---|---:|---:|---|
| 12/08 | 6,08 | 4% | 25/25 |
| 19/08 | 5,72 *(média de 2 execuções: 5,48 e 5,96)* | 10% *(16% e 4%)* | 25/25 |
| 26/08 | 6,32 | 8% | 25/25 |

Aparece em **todos os pontos da grade**, sempre — o problema não é ausência, é posição.
Oscila em torno da 6ª colocação. SoLV subiu de 4% para 8%, mas com ruído grande entre as
duas execuções de 19/08 (16% contra 4% no mesmo dia), o que recomenda cautela: três semanas
não separam sinal de ruído.

### 2. "exame de sangue" — grade 5×5, raio 10 km

| Data | ARP | SoLV | Encontrado |
|---|---:|---:|---|
| 12/08 | 9,48 | 4% | 25/25 |
| 19/08 | 9,68 *(9,60 e 9,76)* | 4% | 25/25 |
| 26/08 | 9,76 | **0%** | 25/25 |

Piora consistente, pequena e na mesma direção nas três medições: ARP subindo (9,48 → 9,76)
e SoLV zerando. É a pior das quatro. Está por volta da 10ª posição — presente na grade
inteira, mas fora do pacote de 3 que o usuário vê sem rolar.

O termo com cidade, "exame de sangue caraguatatuba" (7×7), confirma: ARP 7,69 em 11/08 →
8,48 em 25/08, SoLV 0% nas duas.

### 3. "laboratório em caraguatatuba" — grade 7×7

| Data | Raio | ARP | SoLV | Encontrado |
|---|---|---:|---:|---|
| 11/08 | 25 km | 8,19 | 0% | 26/26 |
| 25/08 | 10 mi (≈16 km) | 7,52 | 0% | 29/29 |

ARP melhorou, mas **os raios são diferentes** — 25 km contra 16 km. Grade menor concentra
os pontos perto da clínica, onde ela ranqueia melhor. Parte do ganho é artefato de medição,
não avanço real. Só duas medições, e não comparáveis entre si.

### 4. "exame laboratorial" — **nunca foi medida**

Zero scans em toda a conta. Não há evolução para reportar. Os termos com "laboratorial" que
existem são outros: "laboratório de análises clínicas", medido uma vez (25/08, 7×7, 10 mi)
com **ARP 21,00 e 0/29 pontos** — ou seja, fora do top 20 em toda a grade.

### Série mais longa disponível — `"laboratório" "exame de sangue"` (7×7, 10 km)

É a única que chega a setembro:

| Data | ARP | SoLV |
|---|---:|---:|
| 11/08 | 8,98 | 2,04% |
| 18/08 | 9,18 | 0% |
| 25/08 | 9,39 | 0% |
| 01/09 | 9,29 | 0% |

Quatro semanas de estabilidade em torno da 9ª posição, com SoLV zerado desde 18/08.

---

## O que não foi possível entregar

**Nenhum scan a 50 km existe, e não consigo criar um.** O raio máximo já usado foi 25 km. O
endpoint de scan sob demanda responde:

```
HTTP 401 — You do not have permission to access Local Falcon On-Demand API endpoints.
```

A chave da API só tem leitura. Para medir a 50 km é preciso rodar pelo painel do Local
Falcon, ou habilitar o add-on de On-Demand API na conta.

**A campanha automática está pausada.** A campanha "Laboratório" (6 palavras-chave, grade
5×5, raio 10 km, semanal, 36 scans por rodada) tem `status: paused` e `next_run: false`
desde a última execução em 25/08. É por isso que a série morre em 26/08 — não é falha de
coleta, é a campanha desligada.

---

## Estado atual do perfil (lido pelo Local Falcon em 05/09)

| Campo | Valor |
|---|---|
| Categoria principal | **Laboratory** |
| Categoria secundária | **Medical Diagnostic Imaging Center** |
| Total de categorias | **2** |
| Nota | **4,6** |
| Avaliações | 402 *(o Windsor lê 409 — defasagem de atualização entre as duas fontes)* |

As categorias foram corrigidas: eram **7** na auditoria de agosto, são **2** agora. Essa era
a ação nº 1 do diagnóstico, e ela foi executada.

**Mas nenhum scan do Google mediu o efeito.** A última medição é de 26/08 e a campanha está
pausada desde 25/08. Se a correção entrou depois disso, os números acima descrevem o perfil
antigo, de 7 categorias — e ainda não sabemos o que a mudança fez.

---

## Recomendação

1. **Religar a campanha.** Sem ela não há série, e sem série não há diagnóstico de evolução.
2. **Trocar o raio para 50 km e a grade para 7×7** nas configurações da campanha, se a
   leitura regional for o que interessa. Manter fixo daí em diante: raio e grade diferentes
   produzem números incomparáveis, como aconteceu em "laboratório em caraguatatuba".
3. **Incluir "exame laboratorial"** na lista de termos — hoje é um ponto cego total.
4. Dar 3 a 4 semanas de scan com as categorias novas antes de concluir qualquer coisa sobre
   o efeito da correção.
