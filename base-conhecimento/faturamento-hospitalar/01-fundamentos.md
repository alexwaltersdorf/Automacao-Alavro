# 01 — Fundamentos do Faturamento Hospitalar

## O que é

Faturamento hospitalar é o processo de transformar toda a produção assistencial
(consultas, exames, internações, cirurgias, medicamentos, materiais, taxas e
diárias) em contas cobráveis das fontes pagadoras — operadoras de planos de
saúde (saúde suplementar), SUS ou o próprio paciente (particular) — de forma
completa, correta e dentro dos prazos contratuais e normativos.

É o coração do **ciclo da receita** (revenue cycle): falhas aqui viram glosa,
perda de receita ou atraso de caixa.

## As três fontes pagadoras

| Fonte | Regras | Documento de cobrança |
|---|---|---|
| **SUS** | Tabela SIGTAP + portarias do Ministério da Saúde | AIH (internação), BPA/APAC (ambulatório) |
| **Saúde suplementar (convênios)** | Padrão TISS/TUSS da ANS + contrato com cada operadora | Guias TISS (XML) + demonstrativos de pagamento |
| **Particular** | Tabela própria do hospital | Nota fiscal / fatura direta |

## Ciclo da receita — macroetapas

1. **Agendamento e elegibilidade** — verificar cadastro do paciente, convênio
   ativo, carências e cobertura do procedimento.
2. **Autorização prévia** — senha/guia autorizada pela operadora (ou AIH
   autorizada pelo gestor SUS) antes do atendimento, quando exigido.
3. **Atendimento e registro assistencial** — prontuário, prescrições,
   evoluções, descrição cirúrgica, checagem de enfermagem. **Tudo que não está
   registrado não pode ser cobrado.**
4. **Lançamento na conta** — codificação de procedimentos (TUSS/SIGTAP),
   medicamentos, materiais, OPME, taxas, diárias e honorários.
5. **Auditoria interna (pré-faturamento)** — conferência da conta contra
   prontuário e contrato antes do envio (ver `06-auditoria-contas.md`).
6. **Fechamento e envio** — geração dos lotes (XML TISS para convênios;
   processamento SIH/SIA para SUS) dentro da competência.
7. **Recebimento e conciliação** — bater demonstrativo de pagamento com o
   valor apresentado; identificar glosas.
8. **Recurso de glosas** — contestação fundamentada dentro do prazo
   contratual (ver `05-glosas.md`).
9. **Indicadores e melhoria contínua** — medir e atacar causas-raiz
   (ver `08-indicadores-kpis.md`).

## Atores e responsabilidades

- **Recepção/Autorização:** cadastro, elegibilidade, senhas de autorização.
  Origem de grande parte das glosas administrativas.
- **Equipe assistencial (médicos, enfermagem):** registro em prontuário,
  checagem de itens, descrição cirúrgica, justificativas clínicas.
- **Faturista/Analista de contas:** montagem, codificação e valoração da conta.
- **Auditor interno (enfermeiro/médico auditor):** conferência técnica
  pré-envio e defesa em recurso de glosa.
- **Auditor da operadora:** analisa a conta pelo lado do pagador (concorrente
  ou in loco em internações longas).
- **Financeiro/Controladoria:** conciliação, contas a receber, provisão de
  glosas.

## Composição típica de uma conta hospitalar de internação

1. **Diárias** (enfermaria, apartamento, UTI) — conforme acomodação contratada.
2. **Taxas** (sala cirúrgica, recuperação, equipamentos, gasoterapia etc.).
3. **Medicamentos** — valorados por Brasíndice (ou tabela contratual).
4. **Materiais descartáveis** — valorados por Simpro (ou tabela contratual).
5. **OPME** (órteses, próteses e materiais especiais) — regras próprias de
   autorização e cobrança (ver `07-modelos-remuneracao.md`).
6. **Procedimentos e honorários** — codificados em TUSS, valorados por CBHPM
   ou tabela negociada; honorários podem ser cobrados pelo hospital ou
   diretamente pelo profissional.
7. **SADT** (serviços auxiliares de diagnose e terapia) — exames de imagem,
   laboratório, etc.

## Regras de ouro

- **Sem registro clínico, sem cobrança.** A conta espelha o prontuário.
- **Sem autorização, risco de glosa integral.** Confirmar senha antes de
  executar procedimentos eletivos.
- **O contrato manda.** Cada operadora tem tabela, regras de pacote, prazos e
  exigências próprias — o faturamento é sempre "por contrato".
- **Competência e prazo.** Conta apresentada fora do prazo contratual pode ser
  recusada; produção SUS fora da competência exige reapresentação.
- **Rastreabilidade.** Todo item cobrado deve ter quem prescreveu, quem
  executou/checou, quando e onde.
