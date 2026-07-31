# Dossiê de Fontes Oficiais — Tabelas de Faturamento Hospitalar

Todas as URLs abaixo foram acessadas e verificadas em 31/07/2026. Estados
"vigentes" citados são o snapshot dessa data — use-os como exemplo do formato,
não como resposta atual.

## Índice

1. [SIGTAP — Tabela SUS (DATASUS)](#1-sigtap)
2. [Padrão TISS e tabelas TUSS (ANS)](#2-tiss-tuss)
3. [Rol de Procedimentos e dados abertos (ANS)](#3-rol-ans)
4. [CMED — preços de medicamentos (ANVISA)](#4-cmed)
5. [CBHPM — portes e UCO (AMB)](#5-cbhpm)
6. [Portarias MS no DOU e sistemas SIH/SIA](#6-dou-ms)
7. [Armadilhas de acesso — resumo](#7-armadilhas)

---

## 1. SIGTAP

**O que é:** tabela nacional do SUS (procedimentos, valores SH/SP/SADT,
compatibilidades). Atualização mensal por competência `AAAAMM`.

**Descobrir a competência vigente (mecanismo automatizável):**
- Feed RSS oficial: `http://sigtap.datasus.gov.br/tabela-unificada/competencias.rss`
  — **somente HTTP puro** (a porta 443 dá connection reset; clientes que
  forçam HTTPS recebem 503). A resposta vem **gzipada** mesmo sem pedir.
  O primeiro `<item>` é a competência mais recente: `<title>` traz
  "Competência MM/AAAA", o `<link>` traz o nome exato do arquivo
  (`TabelaUnificada_AAAAMM_vAAMMDDHHMM.zip`) e `<pubDate>` a data de
  liberação. O sufixo `v` é timestamp de geração — a mesma competência pode
  ser republicada com novo sufixo.
- Portal de consulta: `http://sigtap.datasus.gov.br/tabela-unificada/app/sec/inicio.jsp`
- Página de download: `http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp`
  (oscila; já exibiu "serviço de downloads indisponível" com o RSS funcionando)

**Baixar o arquivo:**
- O link oficial do RSS aponta para `ftp://ftp2.datasus.gov.br/pub/sistemas/tup/downloads/`
  — **FTP e o host ftp2 estão inacessíveis deste ambiente** (sem variante
  HTTPS oficial).
- Caminho prático verificado: espelho comunitário no GitHub (sincronizado
  diariamente às 5h BRT): `https://raw.githubusercontent.com/RenatoKR/SIGTAP/main/tabelas/<NOME_DO_ZIP>`
  (validado: zip íntegro, ~2,1 MB, nomes idênticos aos do RSS oficial).
  **Sempre** confirme que o nome do arquivo bate com o anunciado no RSS e
  informe a procedência ao usuário.

**Formato:** um ZIP por competência com ~87 arquivos: ~44 tabelas `.txt` de
**largura fixa** (sem separador; encoding legado), 42 layouts `*_layout.txt`
(CSV: Coluna,Tamanho...) e Nota Técnica mensal CGSI em PDF — a nota relaciona
as **portarias incorporadas** naquela competência.

**Cadência:** mensal; liberação tipicamente entre os dias 10–20 do próprio mês.
Snapshot 31/07/2026: competência 07/2026, arquivo
`TabelaUnificada_202607_v2607101010.zip` (gerado 10/07/2026).

**Documentação:** wiki oficial `https://wiki.saude.gov.br/sigtap/index.php/Download`.

---

## 2. TISS-TUSS

**O que é:** padrão obrigatório ANS para troca com operadoras; a TUSS são as
tabelas de códigos (18 diárias/taxas, 19 materiais/OPME, 20 medicamentos,
22 procedimentos, 38 motivos de glosa/negativas, etc.).

**Descobrir a versão vigente:**
- Hub oficial: `https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss`
  — aponta para a página da versão vigente no formato
  `.../padrao-tiss-<mês-por-extenso>-<ano>` (ex.: `padrao-tiss-julho-2026`).
- Histórico com vigências e prazos de implementação:
  `.../padrao-tiss-historico-das-versoes-dos-componentes-do-padrao-tiss`
  (snapshot: Julho/2026 publicada 31/07/2026, vigência 01/08/2026, prazo
  31/10/2026).
- **Cada um dos 5 componentes tem competência própria** (ex.: TUSS em 202607
  com Comunicação/Conteúdo/Segurança em 202511) — reporte por componente.

**Download das tabelas TUSS (padrão de URL previsível e estável):**
- `https://www.ans.gov.br/arquivos/extras/tiss/Padrao_TISS_Representacao_de_Conceitos_em_Saude_<AAAAMM>.zip`
  (~413 MB na 202607; XLSX+PDF por tabela; TUSS 19 dividida em PARTE_1/2 com
  ~1,39 milhão de registros)
- `https://www.ans.gov.br/arquivos/extras/tiss/Padrao_TISS_arquivos_auxiliares_<AAAAMM>.zip`
- Verificado para 202607, 202601 e 202505 — para achar a mais recente, probe
  com `Range: bytes=0-0` (resposta 206) dos AAAAMM candidatos, do mês atual
  para trás. Publicação bimestral nos ciclos recentes.
- **Demais componentes têm nomes imprevisíveis** (ex.:
  `copy3_of_PadroTISSComunicao_202511.zip`) — raspe os links da página da
  versão vigente.

**Consulta pontual de código sem baixar 400 MB:** plataforma OCL da ANS
`https://consulta-ocl.apps.sa-1a.mendixcloud.com/p/ocl` (SPA com exportação
Excel/CSV/JSON e API REST `/rest/oclservice/ANS/source` — dados vivos;
snapshot: tuss-22 com 5.964 procedimentos).

**Relacionadas:** mapeamento TUSS×SIGTAP e tabela de erros de envio em
`.../padrao-tiss-tabelas-relacionadas`.

---

## 3. Rol-ANS

**O que é:** cobertura obrigatória dos planos (Anexo I) + Diretrizes de
Utilização (Anexo II/DUT). Atualização contínua por RNs.

**Descobrir a versão vigente:**
- Página: `https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos`
- **O nome do arquivo embute a última RN incorporada** — ex. snapshot:
  `Anexo_I_Rol_2021RN_465.2021_RN671.2026.L.xlsx` (base RN 465/2021
  consolidada até a RN 671/2026; Anexo II até RN 675/2026). Mudou o número no
  nome ⇒ nova versão. **Não fixe a URL** — raspe a página com regex
  `Anexo_I_Rol_.*\.xlsx` / `Anexo_II_DUT_.*\.pdf` / `Correla.*TUSS.*\.xlsx`.
- Consulta interativa: `https://www.ans.gov.br/ROL-web/`.

**Novas RNs:** busca de legislação
`https://www.ans.gov.br/legislacao/busca-de-legislacao` (filtrar tipo=RN,
origem DIPRO, data > última verificada).

**Dados abertos (Apache autoindex, fácil de parsear):**
- `https://dadosabertos.ans.gov.br/FTP/PDA/` (entre sempre por aqui; a raiz é
  vazia). Ordene por data com `?C=M;O=D`; use `Last-Modified` p/ detectar
  mudança sem baixar.
- Prioritários: `terminologia_unificada_saude_suplementar_TUSS-049/`,
  `TISS/HOSPITALAR`, `TISS/AMBULATORIAL`, `painel_de_glosas-057`.

---

## 4. CMED

**O que é:** preços-teto legais de medicamentos — PF (fábrica), PMC
(consumidor) e PMVG (venda ao governo). Nenhum medicamento pode ser cobrado
acima do teto. Atualização mensal + reajuste anual (março).

**Descobrir/baixar a lista vigente:**
- Página: `https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos`
- Extraia do HTML os 4 links vigentes com a regex
  `arquivos/(xls|pdf)_conformidade_(site|gov)_(\d{8})_(\d+)\.(xlsx|pdf)/@@download/file`
  — `conformidade_site` = PF+PMC; `conformidade_gov` = PF+PMVG. O grupo
  `AAAAMMDD` é a data de publicação. **O sufixo de horário é imprevisível —
  nunca construa a URL por data; sempre raspe a página.**
- Confirmação autoritativa: dentro do XLSX há o carimbo
  "Publicada em DD/MM/AAAA HHhMMmin."
- Snapshot: listas publicadas em 21/07/2026 (XLSX PMC ~12,4 MB).

**Parsing do XLSX:** ~50 linhas de notas antes do cabeçalho — localize a linha
que começa com `SUBSTÂNCIA`. Chave estável entre edições: **CÓDIGO GGREM** ou
EAN. Asterisco no valor = isenção ICMS/Confaz 87; coluna "RESTRIÇÃO
HOSPITALAR" indica apresentações sem PMC.

**Histórico:** `.../precos/anos-anteriores/anos-anteriores` (2013–2026,
ano-fiscal CMED de abril a março).

---

## 5. CBHPM

**O que é:** referência AMB para honorários (portes 1A–14C, UCO, porte
anestésico, auxiliares). Edição-base + Resoluções Normativas (RN CNHM) +
Comunicados Oficiais; reajuste anual de portes/UCO em outubro (INPC).

**Descobrir o estado vigente:**
- Página: `https://amb.org.br/cbhpm/` — ler: (a) "A última edição da CBHPM é
  referente ao ano de XXXX" (snapshot: 2022); (b) a RN CNHM de número mais
  alto (snapshot: 071/2026 v2); (c) o Comunicado Oficial mais alto (snapshot:
  026/2026). Estado consolidado = edição-base + todas as RNs/comunicados.
- **Estratégia robusta:** raspar os hrefs `*.pdf` da página e diffar contra
  snapshot armazenado — não adivinhe URLs (o mês da pasta `/wp-content/uploads/AAAA/MM/`
  difere da data do documento; revisões trocam o sufixo `vN` e matam a URL
  antiga).
- Feed RSS do site: `https://amb.org.br/feed/` (monitorar lançamento de
  edições novas).

**Valores de portes/UCO (comunicado anual de outubro):** publicado pela AMB e
republicado por sociedades. Snapshot (comunicado 18/10/2025, via espelho
ABCDI `https://abcdi.org.br/index.php/cbhpm/`): INPC 5,10%, **1 UCO =
R$ 29,80**.

**Importante:** a tabela completa (todos os códigos/portes) **não tem download
público** — é vendida pela AMB (`https://amb.org.br/adquirir-cbhpm/`). O que é
público: RNs, comunicados e erratas em PDF. Em produção, o valor pago segue a
edição + deflator/ágio **do contrato** de cada operadora.

**Acesso:** servidor instável com HTTP/2 → usar User-Agent de navegador e
forçar HTTP/1.1 nos retries.

---

## 6. DOU-MS

**O que é:** as portarias GM/MS e SAES/MS que alteram a tabela SUS saem no
DOU **antes** de consolidarem no SIGTAP — monitorá-las antecipa mudanças.

**Busca no DOU (in.gov.br):**
- `https://www.in.gov.br/consulta/-/buscar/dou?q=%22tabela+de+procedimentos%22&s=do1&orgPrin=Minist%C3%A9rio+da+Sa%C3%BAde&sortType=0`
- Parâmetros confirmados: `q` (aspas p/ frase exata), `s=do1` (Seção 1),
  `orgPrin`, `publishFrom`/`publishTo` (DD-MM-AAAA), `delta`, `currentPage`.
- **Exige HTTP/1.1 + User-Agent de navegador** (curl padrão em HTTP/2 dá
  PROTOCOL_ERROR; fetchers genéricos recebem 502). Os resultados vêm como
  JSON embutido no HTML (chave `jsonArray`) — sem necessidade de JavaScript.
- Edição completa do dia: `https://www.in.gov.br/leiturajornal?data=DD-MM-AAAA&secao=do1`
  (mais robusto p/ varredura diária que a busca ranqueada).
- Ato individual (URL determinística): `https://www.in.gov.br/web/dou/-/{urlTitle}`.

**Texto consolidado de normas:** SAUDELEGIS
`http://saudelegis.saude.gov.br/saudelegis/secure/norma/listPublic.xhtml`
(o antigo `bvsms.saude.gov.br/bvs/saudelegis` está instável — usar só como
fallback).

**Sistemas de processamento:**
- Wiki SIH: `https://wiki.saude.gov.br/sih/index.php/P%C3%A1gina_principal`
  (tem feed Atom de mudanças).
- SIHD (versões de software/remessas): `http://sihd.datasus.gov.br/principal/index.php`
  (503 intermitente — retry).
- Transferência de arquivos DATASUS: `https://datasus.saude.gov.br/transferencia-de-arquivos/`.

---

## 7. Armadilhas

| Portal | Armadilha | Contorno |
|---|---|---|
| gov.br (ANS/ANVISA/MS) | 403 para HEAD e p/ User-Agent de curl | GET com UA de navegador; health-check com `Range: bytes=0-0` (→ 206 + tamanho no Content-Range) |
| sigtap.datasus.gov.br | HTTPS não existe (443 reseta); RSS vem gzipado | usar `http://` puro; descomprimir gzip |
| ftp2.datasus.gov.br | inacessível (FTP/HTTP/HTTPS) | espelho GitHub RenatoKR/SIGTAP validando nome do arquivo contra o RSS |
| in.gov.br | HTTP/2 quebra; fetchers genéricos → 502 | `curl --http1.1 -A 'Mozilla/...'`; parsear `jsonArray` do HTML |
| amb.org.br | HTTP/2 instável; URLs de PDF mudam com revisões (vN) | HTTP/1.1 + UA navegador; diffar hrefs da página, não adivinhar URL |
| CMED / Rol ANS | nome de arquivo com timestamp/nº de RN imprevisível | sempre raspar a página oficial |
| dadosabertos.ans.gov.br | raiz "vazia" | entrar por `/FTP/PDA/`; `?C=M;O=D` ordena por data |
