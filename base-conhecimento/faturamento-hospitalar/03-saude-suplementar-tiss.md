# 03 — Saúde Suplementar e o Padrão TISS

## Contexto

Na saúde suplementar, o hospital fatura contra **operadoras de planos de
saúde** reguladas pela **ANS** (Agência Nacional de Saúde Suplementar). A
troca de informações é obrigatoriamente feita no **Padrão TISS** (Troca de
Informações na Saúde Suplementar), instituído pela ANS e de uso compulsório
para operadoras e prestadores.

A relação comercial (preços, pacotes, prazos, reajustes) é regida pelo
**contrato escrito** entre prestador e operadora, obrigatório desde a
**Lei 13.003/2014** (regulamentada por resoluções normativas da ANS, com
regras de reajuste anual e fator de qualidade).

## Os 5 componentes do Padrão TISS

1. **Organizacional** — regras operacionais e prazos do padrão.
2. **Conteúdo e estrutura** — layout das guias e das mensagens eletrônicas
   (schemas XML publicados pela ANS).
3. **Representação de conceitos em saúde** — a **TUSS** (Terminologia
   Unificada da Saúde Suplementar): tabelas de códigos de procedimentos,
   medicamentos, materiais, OPME, diárias/taxas, CBO, motivos de glosa etc.
4. **Comunicação** — webservices/troca eletrônica de mensagens entre
   prestador e operadora.
5. **Segurança e privacidade** — sigilo e proteção dos dados (alinhado à
   LGPD).

> A versão do padrão TISS evolui continuamente (publicada no site da ANS —
> gov.br/ans → Prestadores → Padrão TISS). Toda automação deve parametrizar a
> versão do schema por operadora/competência.

## Principais guias TISS

| Guia | Uso |
|---|---|
| **Guia de Consulta** | Consultas eletivas |
| **Guia de SP/SADT** | Serviços profissionais e serviços auxiliares de diagnose e terapia (exames, terapias, pequenos procedimentos) |
| **Guia de Solicitação de Internação** | Pedido de autorização da internação |
| **Guia de Resumo de Internação** | Cobrança da internação (diárias, taxas, materiais, medicamentos, procedimentos) |
| **Guia de Honorário Individual** | Cobrança de honorários médicos vinculados a uma internação |
| **Anexos clínicos** | OPME, quimioterapia, radioterapia — detalhamento para autorização |
| **Guia de Prorrogação** | Extensão de diárias/tratamento durante a internação |

Campos críticos comuns: número da guia operadora/prestador, senha de
autorização e validade, código na operadora, carteirinha e validade,
indicação de acidente, CID (quando exigível), códigos TUSS, grau de
participação dos profissionais, via de acesso e técnica (cirurgias),
datas/horas de início e fim.

## Fluxo com a operadora

1. **Elegibilidade** — conferir carteirinha/validade (algumas operadoras têm
   webservice de elegibilidade).
2. **Autorização prévia** — solicitação eletrônica (ou portal) → senha com
   validade e quantidades autorizadas.
3. **Execução e registro.**
4. **Faturamento** — geração do **lote XML TISS** (limites de guias por lote
   conforme padrão/operadora) e envio por webservice ou portal.
5. **Protocolo de recebimento** — marco para contagem de prazos.
6. **Análise da operadora** — pagamento, glosa parcial ou total.
7. **Demonstrativos eletrônicos** — demonstrativo de análise de conta e de
   pagamento (também padronizados no TISS) para conciliação automática.
8. **Recurso de glosa** — eletrônico, com tabela TUSS de motivos de glosa
   (ver `05-glosas.md`).

## Prazos e proteções regulatórias relevantes

- **Contrato obrigatório** (Lei 13.003/2014): deve prever prazos de
  faturamento, análise, pagamento e recurso; reajuste anual com regra
  definida.
- **Prazos máximos de atendimento ao beneficiário** (RN da ANS de garantia de
  atendimento) impactam autorização — negativas e demoras indevidas da
  operadora são recorríveis.
- **Retenção indevida/glosa linear:** vedada; toda glosa deve ser motivada
  item a item com código TUSS de motivo.
- Prazos típicos de mercado (sempre confirmar no contrato): apresentação da
  conta em 60–90 dias do atendimento; pagamento 30 dias após protocolo;
  recurso de glosa 30–60 dias após demonstrativo; resposta da operadora ao
  recurso em prazo espelho.

## Particularidades importantes

- **Honorários médicos:** podem ser faturados pelo hospital (repasse) ou
  diretamente pelas equipes; o grau de participação (cirurgião, 1º/2º
  auxiliar, anestesista) segue percentuais da tabela contratada.
- **Pacotes:** quando há pacote contratado para o procedimento, ele
  **substitui** a cobrança aberta — cobrar itens inclusos no pacote gera
  glosa (ver `07-modelos-remuneracao.md`).
- **Atendimentos de urgência:** dispensam autorização prévia na entrada, mas
  exigem comunicação/autorização posterior conforme contrato.
- **Intercâmbio (ex.: sistema Unimed):** regras próprias de autorização e
  faturamento entre singulares — tratar como "operadora" com parametrização
  específica.
