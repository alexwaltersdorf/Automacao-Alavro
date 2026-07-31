# Base de Conhecimento — Faturamento Hospitalar

Base de conhecimento estruturada para os trabalhos de automação do ciclo de
receita hospitalar (projeto Automacao-Alavro). Cada arquivo cobre um domínio do
faturamento e serve como referência para prompts, agentes, skills e fluxos de
automação (N8N, Supabase, APIs de operadoras/SUS).

## Índice

| Arquivo | Conteúdo |
|---|---|
| [01-fundamentos.md](01-fundamentos.md) | Ciclo da receita, atores, fluxo da conta hospitalar |
| [02-sus.md](02-sus.md) | Faturamento SUS: SIGTAP, AIH/SIH, BPA/APAC/SIA, CNES |
| [03-saude-suplementar-tiss.md](03-saude-suplementar-tiss.md) | Padrão TISS da ANS: componentes, guias, fluxo com operadoras |
| [04-tabelas.md](04-tabelas.md) | TUSS, CBHPM, AMB-92, Brasíndice, Simpro e regras de valoração |
| [05-glosas.md](05-glosas.md) | Tipos de glosa, causas, prevenção e recurso de glosas |
| [06-auditoria-contas.md](06-auditoria-contas.md) | Auditoria de contas médicas (pré e pós-envio) |
| [07-modelos-remuneracao.md](07-modelos-remuneracao.md) | Fee-for-service, pacotes, diárias/taxas, OPME, DRG |
| [08-indicadores-kpis.md](08-indicadores-kpis.md) | KPIs do ciclo de receita e metas de referência |
| [09-glossario.md](09-glossario.md) | Glossário de termos e siglas do segmento |
| [10-automacao.md](10-automacao.md) | Oportunidades de automação mapeadas para este projeto |
| [11-fontes.md](11-fontes.md) | Fontes oficiais, legislação e materiais do acervo do usuário |

## Como usar

- **Como contexto de agente/skill:** injete os arquivos relevantes ao caso de
  uso (ex.: agente de recurso de glosa usa `05-glosas.md` + `04-tabelas.md`).
- **Como documentação viva:** valores de tabelas, versões do TISS e normas da
  ANS mudam com frequência — os arquivos indicam o que deve ser verificado na
  fonte oficial antes de uso em produção (ver `11-fontes.md`).

> **Aviso:** este material é referência operacional/educacional. Valores,
> versões de padrões e prazos normativos devem sempre ser confirmados nas
> fontes oficiais (ANS, DATASUS, AMB, contratos com operadoras) vigentes.
