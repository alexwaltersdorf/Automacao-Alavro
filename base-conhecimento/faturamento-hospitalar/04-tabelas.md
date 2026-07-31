# 04 — Tabelas de Codificação e Valoração

O faturamento privado combina **codificação** (o que foi feito — TUSS) com
**valoração** (quanto vale — tabela negociada em contrato). As tabelas abaixo
são as referências de mercado.

## TUSS — Terminologia Unificada da Saúde Suplementar

- Terminologia **obrigatória** no padrão TISS (mantida pela ANS) para
  identificar procedimentos e itens assistenciais nas guias.
- Organizada em tabelas numeradas — as mais usadas no faturamento:
  - **Tabela 22** — procedimentos e eventos em saúde (base CBHPM);
  - **Tabela 19** — materiais e OPME;
  - **Tabela 20** — medicamentos;
  - **Tabela 18** — diárias, taxas e gases medicinais;
  - Tabelas auxiliares: motivos de glosa, CBO, vias de acesso, graus de
    participação etc.
- TUSS **não traz preço** — só código e descrição. O preço vem do contrato.

## CBHPM — Classificação Brasileira Hierarquizada de Procedimentos Médicos

- Publicada pela **AMB** desde 2003; referência nacional para honorários
  médicos e base da estrutura da TUSS 22.
- Cada procedimento tem:
  - **Porte** (1A a 14C) — valor do trabalho médico; cada porte tem valor de
    referência em R$ publicado pela AMB;
  - **UCO** (Unidade de Custo Operacional) — cobre custo operacional de
    procedimentos que usam infraestrutura (multiplicador × valor da UCO);
  - **Porte anestésico** (0 a 8) — remuneração do anestesista;
  - **Nº de auxiliares** e **% de participação** (1º aux, 2º aux etc.).
- Contratos costumam referenciar uma **edição específica** (CBHPM 5ª ed.,
  2018, 2020...) com **deflator ou ágio** (ex.: "CBHPM 2018 com deflator de
  20%") e valor de UCO próprio. Sempre parametrizar por contrato.
- Regras de faturamento múltiplo usuais (confirmar em contrato): cirurgias no
  mesmo ato pela mesma via — 100% da maior + 50% das demais (via de acesso
  diferente: 100% + 70%, variando por contrato); bilateralidade; urgência
  (acréscimo, tipicamente 30%, em horário especial).

### Acervo local (Google Drive do usuário)

- CBHPM 2018 completa (PDF, 4.752 procedimentos).
- Comunicado oficial Portes CBHPM out/2018 — UCO = R$ 20,47.
- Comunicado oficial Portes CBHPM out/2019 — UCO = R$ 21,07.
- Tabela AMB-92 (PDF).

## AMB-92 (e AMB-90/96)

Tabelas antigas da AMB baseadas em **CH (Coeficiente de Honorários)**: cada
procedimento vale X CH e o contrato define o valor do CH em reais. Ainda
aparecem em contratos legados — automação deve suportar valoração por CH.

## Brasíndice — medicamentos

- Guia farmacêutico com preços de medicamentos (PF — preço fábrica, PMC —
  preço máximo ao consumidor), atualizado quinzenal/mensalmente.
- Contratos definem a base (ex.: "PF Brasíndice + 0%" ou "PMC − 10%") e a
  edição vigente na data do atendimento.
- Medicamentos restritos a ambiente hospitalar costumam ser valorados por PF.

## Simpro — materiais e alguns medicamentos

- Revista/base com preços de **materiais descartáveis e OPME**; mesma lógica
  contratual (Simpro com deságio/ágio definido em contrato).

## CMED / Tabela TNUMM

- **CMED**: teto regulatório de preços de medicamentos (ANVISA) — nenhum
  medicamento pode ser cobrado acima do PMC/PF CMED.
- Ressarcimentos e OPME podem referenciar tabelas próprias da operadora ou
  registros ANVISA — guardar rastreabilidade (nota fiscal, etiqueta,
  registro) para OPME.

## SIGTAP (SUS)

Ver `02-sus.md` — no SUS a tabela é única, nacional e com valor fechado.

## Regras práticas de valoração (checklist do faturista)

1. Identificar o contrato/tabela vigente da operadora na **data do evento**.
2. Codificar em TUSS; valorar porte/UCO/CH conforme a edição contratada.
3. Aplicar regras de múltiplos procedimentos, bilateralidade e urgência.
4. Medicamentos: Brasíndice da quinzena correta + margem contratual.
5. Materiais: Simpro da edição correta + margem contratual.
6. OPME: regra específica do contrato (tabela própria, NF + margem, ou
   pacote) + anexo TISS de OPME autorizado.
7. Diárias/taxas: tabela 18 TUSS + valores contratados; conferir acomodação.
8. Conferir se o item não está **incluso em pacote** contratado.
