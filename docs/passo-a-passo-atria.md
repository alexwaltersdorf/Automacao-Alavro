# Passo a passo — Ajuste dos exames na tela do Átria

Aplicação **manual** no Átria LIS (Avantix). Use junto com a tabela DE-PARA
(`docs/exames-hepatite-de-para.md`) já preenchida com os códigos do Álvaro.

## 1. Backup primeiro (obrigatório)

Antes de qualquer alteração, garanta um backup do banco do Átria. Se não souber
fazer, peça ao responsável de TI/suporte do Avantix. **Não pule esta etapa.**

## 2. Abrir o cadastro de exames

`Cadastros e Parametrizações` → `Exames / Procedimentos / Analises / Interface`
→ `Exames / Procedimentos / Analises`

## 3. Para cada um dos 15 exames

Localize o exame pelo **código atual** (coluna 2 da tabela DE-PARA) e faça:

### a) Corrigir a grafia do nome
- Atualize o campo de **Nome/Descrição** para a grafia corrigida (coluna 3).

### b) Preencher o Código do Apoio / B2B  ← principal
- Procure na ficha do exame (ou na aba de **Laboratório de Apoio / Integração /
  B2B**) o campo de **código do apoio / código externo**.
- Preencha com o **Código Álvaro** (coluna 4).
- Confirme que o laboratório de apoio selecionado é o **Álvaro**.

> Onde fica esse campo pode variar conforme a versão do Átria. Se não achar na
> ficha do exame, verifique o menu
> `Cadastros e Parametrizações` → `Laboratório de Apoios e Integrações - B2B`,
> onde normalmente se faz o de-para entre o código interno e o código do apoio.

### c) (Opcional) Igualar o código interno
- Se o Átria **permitir editar** o mnemônico e o exame **não estiver amarrado** a
  histórico/faturamento que você não queira quebrar, altere o código interno para
  ficar **igual ao do Álvaro**.
- Se **não permitir** ou houver risco, **mantenha** o código interno e siga apenas
  com o campo de apoio/B2B preenchido (passo b).

## 4. Validar

- Comece por **1 exame** (ex.: `AU`), salve e confira se:
  - o nome aparece corrigido;
  - o código do apoio/B2B está gravado e vinculado ao Álvaro;
  - um pedido de teste com esse exame envia/consulta corretamente no Álvaro.
- Só depois repita para os outros 14.

## 5. Registrar

Marque na tabela DE-PARA cada exame já concluído, para não perder o controle do
lote.
