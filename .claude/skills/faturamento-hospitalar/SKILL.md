---
name: faturamento-hospitalar
description: >-
  Especialista em faturamento hospitalar brasileiro com foco em buscar e
  verificar ATUALIZAÇÕES de tabelas e valores em fontes OFICIAIS: SIGTAP/DATASUS
  (tabela SUS por competência), Padrão TISS e tabelas TUSS da ANS, Rol de
  Procedimentos da ANS, listas de preços CMED/ANVISA (PF, PMC, PMVG), CBHPM/AMB
  (portes e UCO) e portarias do Ministério da Saúde no DOU. Use SEMPRE que o
  usuário perguntar sobre versão vigente, competência atual, download de tabela,
  "a tabela mudou?", atualização de valores, reajuste, nova RN da ANS, nova
  portaria SUS, conferência de preço-teto de medicamento, parametrização de
  sistema de faturamento, ou mencionar SIGTAP, TISS, TUSS, CMED, CBHPM, UCO,
  Rol ANS, AIH, Brasíndice ou Simpro — mesmo que não use a palavra
  "atualização". Também use para montar rotinas/robôs de monitoramento dessas
  fontes.
---

# Faturamento Hospitalar — Atualização de Tabelas Oficiais

Esta skill verifica e baixa as tabelas oficiais que regem o faturamento
hospitalar no Brasil, sempre a partir das fontes primárias (DATASUS, ANS,
ANVISA/CMED, AMB, DOU). Todas as URLs e mecânicas aqui documentadas foram
verificadas de fato — inclusive as armadilhas de acesso de cada portal.

Contexto de domínio (conceitos, glosas, TISS, SUS): se este repositório tiver
`base-conhecimento/faturamento-hospitalar/`, leia o arquivo pertinente ao caso.

## Ferramenta principal

Use o script incluído para consultar o estado vigente de todas as fontes:

```bash
python3 scripts/tabelas_oficiais.py status            # todas as fontes
python3 scripts/tabelas_oficiais.py status --fonte sigtap
python3 scripts/tabelas_oficiais.py baixar sigtap     # baixa p/ data/tabelas-oficiais/
python3 scripts/tabelas_oficiais.py baixar cmed
python3 scripts/tabelas_oficiais.py dou               # portarias recentes de tabela SUS no DOU
```

O script imprime, por fonte: versão/competência vigente, data de publicação e
URL de download. Com `--salvar`, grava o snapshot em
`data/estado-tabelas.json`; execuções seguintes marcam `[NOVO]` no que mudou —
é assim que se responde "houve atualização?". Rode com `status --salvar` ao
final de uma verificação para manter o histórico.

Se o script falhar para uma fonte (portais do governo oscilam), não desista:
consulte `references/fontes-oficiais.md` e faça a verificação manual com
WebFetch/curl seguindo as instruções de acesso daquela fonte — as seções
incluem os contornos conhecidos (User-Agent, HTTP/1.1, http:// puro etc.).

## O que cada fonte cobre (e quando consultar)

| Fonte | Tabela/valor | Quando o usuário precisa |
|---|---|---|
| **SIGTAP** (DATASUS) | Tabela SUS: procedimentos, valores SH/SP/SADT, regras | Faturamento SUS, AIH/BPA/APAC, competência mensal |
| **TISS/TUSS** (ANS) | Terminologia p/ convênios: tab 18, 19, 20, 22, glosas | Parametrizar sistema, codificar guias, versão do padrão |
| **Rol** (ANS) | Cobertura obrigatória dos planos + DUT | Negativa de cobertura, procedimento é coberto? |
| **CMED** (ANVISA) | Preço-teto de medicamentos: PF, PMC, PMVG | Conferir valoração/glosa de medicamento, teto legal |
| **CBHPM** (AMB) | Portes, UCO, porte anestésico, auxiliares | Honorários médicos, reajuste anual (outubro, INPC) |
| **DOU** (in.gov.br) | Portarias GM/MS e SAES/MS que alteram a tabela SUS | Saber o que mudou e por quê, antes da consolidação no SIGTAP |

## Regras que evitam respostas erradas

1. **Nunca invente URL de arquivo.** SIGTAP, CMED, Rol e componentes TISS têm
   nomes de arquivo imprevisíveis (timestamp/nº de RN embutido). O caminho
   certo é: descobrir via feed/página oficial → então baixar. As duas exceções
   previsíveis são o ZIP TUSS da ANS (`..._<AAAAMM>.zip`) e as páginas de
   versão TISS (`padrao-tiss-<mês>-<ano>`).
2. **Cite sempre versão + data + fonte.** Resposta útil = "SIGTAP competência
   07/2026, versão gerada em 10/07/2026, baixada de <URL>", nunca "a tabela
   mais recente".
3. **Uma competência pode ser republicada.** O sufixo de versão do SIGTAP
   (`vAAMMDDHHMM`) muda sem mudar a competência — compare o nome completo do
   arquivo, não só o AAAAMM. O mesmo vale para RNs da CBHPM (sufixo v2/v3).
4. **Valores CBHPM/Brasíndice/Simpro em produção vêm do contrato.** A skill
   informa o referencial oficial vigente; o valor pago segue a edição e o
   deságio/ágio contratados com cada operadora. Diga isso ao usuário quando
   relevante.
5. **Espelho comunitário ≠ fonte oficial.** O download HTTPS do SIGTAP usa um
   espelho comunitário no GitHub (o FTP oficial não responde neste ambiente).
   Sempre valide que o nome do arquivo baixado é idêntico ao anunciado no RSS
   oficial do DATASUS e informe o usuário da procedência.
6. **Não commitar binários grandes.** Downloads vão para
   `data/tabelas-oficiais/` (ignorada no git). O ZIP TUSS tem ~400 MB — só
   baixe se o usuário precisar do conteúdo, e prefira a API OCL da ANS para
   consultas pontuais de código.

## Formato de resposta para "verifique atualizações"

```
## Tabelas oficiais — situação em <data>

| Fonte | Vigente | Publicação | Situação |
|---|---|---|---|
| SIGTAP | competência 07/2026 (v2607101010) | 10/07/2026 | [NOVO] ou inalterado |
| TISS/TUSS | Padrão Julho/2026 · TUSS 202607 | 31/07/2026 | ... |
| ...

**O que mudou:** <resumo do que é novo e impacto prático>
**Downloads:** <URLs oficiais verificadas>
**Ação recomendada:** <ex.: reimportar SIGTAP antes do fechamento da competência>
```

## Aprofundamento

- `references/fontes-oficiais.md` — dossiê por fonte: URLs verificadas, como
  descobrir a versão vigente, formato dos arquivos, cadência e armadilhas de
  acesso (leia a seção da fonte antes de qualquer verificação manual).
- `scripts/tabelas_oficiais.py` — fonte da verdade das mecânicas de acesso;
  ao encontrar mudança de comportamento num portal, atualize script e
  referência juntos.
