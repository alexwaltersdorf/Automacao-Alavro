# 10 — Oportunidades de Automação (Projeto Automacao-Alavro)

Mapa das automações de maior impacto no ciclo de receita, ordenadas por
relação impacto × esforço. Stack de referência do usuário: N8N, Supabase,
APIs/webservices TISS, IA (Claude) para leitura de documentos e geração de
peças de recurso.

## 1. Elegibilidade e autorização (previne glosa administrativa)

- **Robô de elegibilidade:** na véspera do atendimento, consultar webservice/
  portal da operadora e sinalizar pendências (carteirinha vencida, plano
  inativo).
- **Conferência senha × agenda:** cruzar procedimentos agendados com senhas
  emitidas (código TUSS, quantidade, validade) e alertar divergências antes
  da execução.
- **Fila de autorizações:** acompanhar solicitações pendentes na operadora e
  cobrar resposta dentro dos prazos da ANS.

## 2. Validação de contas pré-envio (motor de regras)

- Base SIGTAP mensal importada (SUS) + tabelas contratuais por operadora
  (TUSS/CBHPM/Brasíndice/Simpro com vigências) no banco.
- Críticas automáticas antes do fechamento:
  - código × tabela contratada × valor;
  - compatibilidade CID × procedimento × sexo/idade;
  - item incluso em pacote cobrado à parte;
  - quantidade acima do autorizado/permitido;
  - campos obrigatórios da guia TISS vazios;
  - prazo de apresentação da competência.
- IA para checar respaldo documental: cruzar itens da conta com prontuário/
  checagens digitalizadas e apontar itens sem evidência.

## 3. Envio e conciliação

- Geração/validação de XML TISS contra o schema da versão vigente por
  operadora; gestão de protocolos.
- **Conciliação automática:** importar demonstrativos de análise e pagamento,
  casar com o apresentado (guia a guia, item a item) e classificar glosas por
  motivo TUSS.
- Conciliação bancária: pagamento recebido × demonstrativo × contas a
  receber.

## 4. Gestão de glosas com IA

- Triagem automática: acatável × recorrível (por motivo, histórico de êxito e
  valor).
- **Gerador de recurso:** IA monta a peça de recurso por item (fato,
  fundamento contratual, evidência anexa) a partir da base de pareceres
  padronizados (`05-glosas.md`, `06-auditoria-contas.md`).
- Painel Pareto de motivos por operadora/setor com plano de ação.

## 5. SUS

- Validador de AIH/BPA/APAC contra SIGTAP da competência antes da exportação
  (reduz rejeição).
- Alerta de reapresentação: fila de contas rejeitadas com prazo-limite.
- Conferência produção apresentada × aprovada × repasse.

## 6. Indicadores

- Dashboard (ver `08-indicadores-kpis.md`) alimentado pelo banco de contas:
  glosa inicial, recuperação, DSO, aging, fechamento de contas.
- Alertas proativos (WhatsApp/e-mail) para estouro de metas e prazos.

## Dados mestres necessários (fundação do projeto)

| Entidade | Conteúdo | Fonte |
|---|---|---|
| Operadoras/contratos | tabelas, vigências, prazos, regras de pacote | contratos + aditivos |
| Tabelas de preço | CBHPM (edição/UCO), Brasíndice, Simpro, tabelas próprias | AMB, editoras, operadora |
| TUSS | tabelas 18/19/20/22 + motivos de glosa | ANS (atualização periódica) |
| SIGTAP | tabela mensal completa | DATASUS (download mensal) |
| CNES | profissionais, habilitações, serviços | DATASUS |
| Cadastro de convênios no sistema HIS | de-para código interno × TUSS | sistema hospitalar |

## Sequência sugerida de implantação

1. Fundação de dados (tabelas + contratos parametrizados).
2. Conciliação automática de demonstrativos (visibilidade imediata da glosa).
3. Motor de críticas pré-envio (redução de glosa inicial).
4. Robôs de elegibilidade/autorização (prevenção na origem).
5. IA de recursos de glosa (recuperação).
6. Dashboards e alertas (gestão contínua).
