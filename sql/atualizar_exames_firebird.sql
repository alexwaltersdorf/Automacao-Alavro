/* =====================================================================
   Átria LIS (Avantix) — Alinhamento de exames de hepatite com o Álvaro
   Banco: FIREBIRD (template)
   =====================================================================

   ATENÇÃO — LEIA ANTES DE EXECUTAR
   1. Este é um TEMPLATE. Os nomes de TABELA e COLUNAS abaixo são
      SUPOSIÇÕES e precisam ser confirmados no banco real do Átria.
      Ajuste-os conforme o resultado da investigação feita na sessão
      local do Claude Code.
   2. Faça BACKUP antes. Ex.: gbak -b -v host:/caminho/BANCO.FDB backup.fbk
   3. Preencha os códigos do Álvaro (placeholders <ALVARO_*>) usando a
      tabela docs/exames-hepatite-de-para.md.
   4. Rode primeiro o SELECT de conferência, depois 1 UPDATE de teste,
      e só então o lote. Confira antes de COMMIT.

   Substitua os identificadores entre < >:
     <TAB_EXAME>        -> tabela de cadastro de exames        (ex.: EXAMES)
     <COL_CODIGO>       -> coluna do código/mnemônico interno  (ex.: CODIGO)
     <COL_NOME>         -> coluna do nome/descrição            (ex.: DESCRICAO)
     <COL_COD_APOIO>    -> coluna do código do apoio/B2B       (ex.: COD_APOIO)
   ===================================================================== */

/* ---------- 1) CONFERÊNCIA (rode primeiro, não altera nada) ---------- */
SELECT <COL_CODIGO>, <COL_NOME>, <COL_COD_APOIO>
FROM   <TAB_EXAME>
WHERE  <COL_CODIGO> IN
       ('AU','HBCM','HBCT','HBE','HBEAG','HCV','HVAG','HVAM',
        'QAU','QHBCM','QHBCT','QHBE','QHBEAG','QHCV','QHVAM');


/* ---------- 2) TESTE com 1 exame (AU) ---------- */
/* Preencha <ALVARO_AU> com o código do Álvaro antes de rodar. */
UPDATE <TAB_EXAME>
SET    <COL_NOME>      = 'Hepatite B - HBsAg (Antigeno de Superficie)',
       <COL_COD_APOIO> = '<ALVARO_AU>'
WHERE  <COL_CODIGO>    = 'AU';
/* Confira o resultado. Se OK, COMMIT; senão, ROLLBACK. */


/* ---------- 3) LOTE COMPLETO (grafia + código do apoio/B2B) ---------- */
/* Preencha todos os <ALVARO_*> com os códigos do Álvaro. */

UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - HBsAg (Antigeno de Superficie)', <COL_COD_APOIO>='<ALVARO_AU>'     WHERE <COL_CODIGO>='AU';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - Anti-HBc IgM',                   <COL_COD_APOIO>='<ALVARO_HBCM>'   WHERE <COL_CODIGO>='HBCM';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - Anti-HBc Total (IgG+IgM)',       <COL_COD_APOIO>='<ALVARO_HBCT>'   WHERE <COL_CODIGO>='HBCT';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - Anti-HBe',                       <COL_COD_APOIO>='<ALVARO_HBE>'    WHERE <COL_CODIGO>='HBE';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - HBeAg',                          <COL_COD_APOIO>='<ALVARO_HBEAG>'  WHERE <COL_CODIGO>='HBEAG';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite C - Anti-HCV',                       <COL_COD_APOIO>='<ALVARO_HCV>'    WHERE <COL_CODIGO>='HCV';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite A - Anti-HAV IgG',                   <COL_COD_APOIO>='<ALVARO_HVAG>'   WHERE <COL_CODIGO>='HVAG';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite A - Anti-HAV IgM',                   <COL_COD_APOIO>='<ALVARO_HVAM>'   WHERE <COL_CODIGO>='HVAM';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - HBsAg (Antigeno de Superficie)', <COL_COD_APOIO>='<ALVARO_QAU>'    WHERE <COL_CODIGO>='QAU';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - Anti-HBc IgM',                   <COL_COD_APOIO>='<ALVARO_QHBCM>'  WHERE <COL_CODIGO>='QHBCM';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - Anti-HBc Total (IgG+IgM)',       <COL_COD_APOIO>='<ALVARO_QHBCT>'  WHERE <COL_CODIGO>='QHBCT';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - Anti-HBe',                       <COL_COD_APOIO>='<ALVARO_QHBE>'   WHERE <COL_CODIGO>='QHBE';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite B - HBeAg',                          <COL_COD_APOIO>='<ALVARO_QHBEAG>' WHERE <COL_CODIGO>='QHBEAG';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite C - Anti-HCV',                       <COL_COD_APOIO>='<ALVARO_QHCV>'   WHERE <COL_CODIGO>='QHCV';
UPDATE <TAB_EXAME> SET <COL_NOME>='Hepatite A - Anti-HAV IgM',                   <COL_COD_APOIO>='<ALVARO_QHVAM>'  WHERE <COL_CODIGO>='QHVAM';

/* Revise tudo e então: COMMIT;  (ou ROLLBACK; para desfazer) */

/* ---------- 4) (OPCIONAL) Igualar o código interno ao do Álvaro ------
   Só se o Átria permitir e não houver amarração a preservar. Firebird
   normalmente NÃO deixa alterar chave referenciada por FKs — teste 1 a 1.
   Exemplo:
   UPDATE <TAB_EXAME> SET <COL_CODIGO>='<ALVARO_AU>' WHERE <COL_CODIGO>='AU';
   -------------------------------------------------------------------- */
