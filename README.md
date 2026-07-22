# Automação Álvaro — Alinhamento de Exames Átria ↔ Laboratório Álvaro

Material de apoio para **corrigir a grafia e alinhar os códigos** de exames no
sistema **Átria LIS (Avantix)** da Total Quality (Caraguatatuba/SP) com os
códigos do **Laboratório Álvaro** (laboratório de apoio, integração B2B).

> ⚠️ **Este repositório roda em uma sessão na nuvem e NÃO tem acesso à máquina
> onde o Átria está instalado.** A aplicação real das mudanças deve ser feita:
> (a) manualmente na tela do Átria, ou (b) por uma **sessão local do Claude Code**
> rodando no computador da clínica (`C:\Users\suporte\OneDrive\AVANTIX\TotalQuality-Caragua`).

## Estratégia definida

1. **Preencher o campo "Código do Apoio / B2B"** de cada exame com o código do
   **Laboratório Álvaro**. Esse é o objetivo principal — é o que faz a integração
   B2B funcionar e permite a equipe consultar o exame no site do Álvaro.
2. **Sempre que o Átria permitir editar o mnemônico, deixar o código interno IGUAL
   ao código do Álvaro** — para que as duas plataformas usem o mesmo código e a
   consulta futura fique simples e sem tradução.
3. Se o Átria **não deixar** editar o código interno (exame já em uso), **manter o
   interno** e garantir apenas o campo de apoio/B2B preenchido.
4. **Corrigir a grafia** do nome do exame em todos os casos.

## Escopo atual

Primeiro lote: **15 exames de hepatite (A, B e C)**, incluindo as versões com
prefixo `Q` (2ª metodologia — presumivelmente Quimioluminescência/CLIA).

## Conteúdo

| Arquivo | Para que serve |
|---|---|
| [`docs/exames-hepatite-de-para.md`](docs/exames-hepatite-de-para.md) | Tabela DE-PARA: código atual Átria → código Álvaro → grafia corrigida |
| [`docs/passo-a-passo-atria.md`](docs/passo-a-passo-atria.md) | Como aplicar manualmente na tela do Átria |
| [`prompts/prompt-claude-code-local.md`](prompts/prompt-claude-code-local.md) | Prompt pronto para colar na sessão LOCAL do Claude Code |
| [`sql/atualizar_exames_firebird.sql`](sql/atualizar_exames_firebird.sql) | Template de UPDATE para banco Firebird |
| [`sql/atualizar_exames_sqlserver.sql`](sql/atualizar_exames_sqlserver.sql) | Template de UPDATE para banco SQL Server |

## ⚠️ Antes de mexer

O **código/mnemônico do exame é uma chave** no LIS (amarrado a convênios/TUSS,
interfaces de equipamento, sinonímias, perfis, pedidos e histórico). Por isso:

- **Sempre faça backup** da(s) tabela(s) antes de qualquer `UPDATE`.
- Prefira preencher o **campo de apoio/B2B** a sobrescrever o código principal.
- Teste com **1 exame** antes de aplicar o lote todo.
