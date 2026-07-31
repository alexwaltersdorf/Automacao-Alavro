# 05 — Glosas: Tipos, Causas, Prevenção e Recurso

**Glosa** é o não pagamento (total ou parcial) de item apresentado na conta.
É o principal indicador de dor do faturamento — a meta é **prevenir** (glosa
inicial baixa) e **reverter** (recurso eficaz).

## Tipos de glosa

### 1. Glosa administrativa (a mais comum e a mais evitável)
Erros de processo/cadastro, sem mérito clínico:
- guia sem autorização/senha, senha vencida ou quantidade excedida;
- erro de matrícula, validade de carteirinha, dados do beneficiário;
- código TUSS inválido para a tabela contratada, valor divergente do
  contrato;
- falta de assinatura/carimbo, guia ilegível ou campo obrigatório vazio;
- apresentação fora do prazo contratual; duplicidade de cobrança;
- divergência entre XML e documentação física/digitalizada.

### 2. Glosa técnica (mérito assistencial)
Apontada por auditor médico/enfermeiro da operadora:
- cobrança sem respaldo no prontuário (medicamento sem checagem, curativo
  sem evolução, quantidade acima do prescrito);
- diária/acomodação incompatível com a evolução clínica;
- procedimento incompatível com CID/quadro; OPME sem justificativa;
- item incluso em pacote/taxa cobrado em separado.

### 3. Glosa linear
Corte percentual aplicado sobre a conta sem motivação item a item — **prática
vedada**; deve ser recorrida integralmente e tratada como pendência
contratual.

## Causas-raiz típicas (para atacar com automação)

| Causa-raiz | Onde nasce | Prevenção |
|---|---|---|
| Cadastro/elegibilidade errada | Recepção | Validação automática de elegibilidade antes do atendimento |
| Falta de autorização | Recepção/Agendamento | Robô de solicitação e conferência de senha × procedimento agendado |
| Registro assistencial incompleto | Equipe clínica | Checklist de prontuário; travas de fechamento de conta |
| Codificação/valoração errada | Faturamento | Motor de regras por contrato (tabela, pacote, múltiplos, urgência) |
| Perda de prazo | Faturamento | Fila por competência com alerta de aging |
| Divergência de tabela | Contrato desatualizado no sistema | Governança de cadastro de contratos e vigências |

## Fluxo de gestão de glosas

1. **Captura** — importar demonstrativos de análise/pagamento (TISS) e
   classificar cada item glosado pelo **código de motivo TUSS**.
2. **Triagem** — separar: acatável (erro nosso, corrigir processo) ×
   recorrível (temos evidência) × perda (sem defesa/prazo).
3. **Recurso** — peça objetiva por item: motivo da glosa, contra-argumento,
   evidência anexa (prontuário, prescrição, checagem, senha, contrato,
   print de autorização). Enviar no padrão eletrônico da operadora dentro do
   prazo contratual.
4. **Acompanhamento** — prazo de resposta da operadora; 2ª instância de
   recurso quando prevista; escalonar para negociação/jurídico o resíduo.
5. **Feedback loop** — todo motivo de glosa recorrente vira ação preventiva
   na origem (a glosa boa é a que deixa de existir).

## Modelo mental para recurso eficaz

- **Fato:** o que foi cobrado e o que foi glosado (código, quantidade, valor).
- **Fundamento:** cláusula contratual / tabela / norma ANS / registro clínico
  que sustenta a cobrança.
- **Evidência:** documento anexo que prova o fundamento.
- **Pedido:** reprocessamento e pagamento do valor glosado, corrigido quando
  cabível.

## Indicadores essenciais (detalhe em `08-indicadores-kpis.md`)

- % glosa inicial = glosado / apresentado.
- % recuperação de glosa = recuperado / glosado recorrido.
- Glosa definitiva (perda) = glosado − recuperado.
- Top motivos de glosa (Pareto) por operadora e por setor de origem.
