# 02 — Faturamento SUS

## Visão geral

No SUS o hospital (público, filantrópico ou privado contratualizado) é
remunerado pela **produção aprovada** segundo a tabela nacional de
procedimentos, processada pelos sistemas do DATASUS. Não há negociação de
preço: o valor é o da tabela vigente (acrescido de incentivos/complementações
estaduais ou municipais quando pactuados).

## SIGTAP — a tabela do SUS

**SIGTAP** = Sistema de Gerenciamento da Tabela de Procedimentos, Medicamentos
e OPM do SUS (sigtap.datasus.gov.br).

Cada procedimento tem:
- **Código de 10 dígitos** (ex.: grupo 03 = procedimentos clínicos, 04 =
  cirúrgicos).
- **Atributos/regras:** valor (SH – serviço hospitalar, SP – serviço
  profissional, SADT), instrumento de registro (AIH, BPA, APAC), CBO dos
  profissionais habilitados, CID compatíveis, idade, sexo, quantidade máxima,
  média de permanência, habilitações exigidas do estabelecimento (CNES) e
  compatibilidades entre procedimentos.
- **Competência mensal:** a tabela é republicada todo mês; sempre faturar com
  a versão da competência do atendimento.

> Automação: o SIGTAP é baixável em arquivos (layout TXT publicado
> mensalmente pelo DATASUS) — base ideal para validação automática de contas.

## Internação — AIH e SIH/SUS

- **AIH (Autorização de Internação Hospitalar):** documento que autoriza e
  identifica a internação. Emitida/autorizada pelo gestor local (autorizador),
  a partir do **Laudo de Solicitação de Internação**.
- **SIH/SUS:** sistema de informação hospitalar que processa as AIHs
  (aplicativo SISAIH01 para digitação/exportação no hospital; processamento
  pelo gestor).
- A remuneração da internação é por **procedimento principal** (valor global
  que embute diárias e insumos) + **procedimentos especiais/secundários**
  permitidos (hemoterapia, UTI, OPM, procedimentos sequenciais etc.).
- Conceitos importantes: procedimento principal x realizado, mudança de
  procedimento, **AIH de longa permanência** (continuidade), críticas de
  compatibilidade (CID x procedimento x CBO x habilitação), média de
  permanência e **diárias de UTI** informadas por tipo.
- A produção é apresentada por **competência mensal**; contas rejeitadas nas
  críticas voltam para correção e **reapresentação** em competências
  seguintes (há prazo-limite para apresentação — confirmar norma vigente,
  historicamente até 4 competências).

## Ambulatório — SIA/SUS

Instrumentos de registro:
- **BPA-C (consolidado):** produção agregada por procedimento/CBO/quantidade,
  sem identificação do paciente.
- **BPA-I (individualizado):** produção identificada (paciente, CNS, CID)
  para procedimentos que a tabela exige individualização.
- **APAC (Autorização de Procedimento de Alta Complexidade/Custo):**
  procedimentos ambulatoriais de alta complexidade ou de ciclo contínuo
  (TRS/diálise, quimioterapia, radioterapia, medicamentos especializados
  etc.). Tem laudo próprio, validade (em geral até 3 competências) e é
  identificada por paciente.
- **RAAS:** registro das ações ambulatoriais de atenção domiciliar e
  psicossocial.

## CNES — pré-requisito de tudo

O **CNES** (Cadastro Nacional de Estabelecimentos de Saúde) precisa refletir a
realidade do hospital: serviços, habilitações, leitos, equipamentos e
profissionais (com CBO e carga horária). Críticas do SIH/SIA validam a conta
contra o CNES — profissional não cadastrado ou habilitação ausente ⇒ conta
rejeitada/glosada.

## Cartão Nacional de Saúde (CNS)

Identificador do usuário exigido nos registros individualizados (AIH, BPA-I,
APAC). Cadastro incorreto é causa comum de rejeição.

## Fluxo resumido do faturamento SUS (internação)

1. Laudo de solicitação de AIH → autorizador emite número de AIH.
2. Atendimento e registro clínico completo.
3. Codificação SIGTAP (procedimento principal, especiais, CID principal e
   secundários, CBO dos profissionais).
4. Digitação/importação no SISAIH01 → exportação do lote mensal.
5. Processamento pelo gestor (críticas) → produção **aprovada** compõe o
   repasse; rejeições retornam para correção e reapresentação.
6. Conferência do relatório de produção aprovada x apresentada (é a
   "conciliação" do SUS).

## Pontos de atenção clássicos

- Divergência CID x procedimento x idade/sexo do paciente.
- Profissional sem vínculo/CBO compatível no CNES na competência.
- Estabelecimento sem a habilitação exigida pelo procedimento.
- Quantidade acima do máximo permitido pela tabela.
- Perda de prazo de apresentação/reapresentação.
- Não cobrança de procedimentos especiais permitidos (perda silenciosa de
  receita — ex.: diárias de UTI, hemoderivados, acompanhante quando devido).
