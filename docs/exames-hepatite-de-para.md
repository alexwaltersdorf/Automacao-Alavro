# DE-PARA — Exames de Hepatite (Átria ↔ Laboratório Álvaro)

Primeiro lote: 15 exames. Objetivo: **campo Código do Apoio/B2B = código do Álvaro**
e, quando possível, **código interno do Átria = mesmo código do Álvaro**.

## Como preencher a coluna "Código Álvaro"

O código do Álvaro **não está disponível nesta sessão na nuvem**. Ele deve ser
obtido na sessão **local** do Claude Code (que já tem acesso à lista do Álvaro) ou
consultado no **portal / manual de exames do Laboratório Álvaro**. Preencha a
coluna abaixo antes de rodar qualquer atualização.

## Tabela

| # | Cód. atual Átria | Grafia corrigida (nome) | Código Álvaro (PREENCHER) |
|---|---|---|---|
| 1 | AU | Hepatite B - HBsAg (Antígeno de Superfície) | `__________` |
| 2 | HBCM | Hepatite B - Anti-HBc IgM | `__________` |
| 3 | HBCT | Hepatite B - Anti-HBc Total (IgG+IgM) | `__________` |
| 4 | HBE | Hepatite B - Anti-HBe | `__________` |
| 5 | HBEAG | Hepatite B - HBeAg | `__________` |
| 6 | HCV | Hepatite C - Anti-HCV | `__________` |
| 7 | HVAG | Hepatite A - Anti-HAV IgG | `__________` |
| 8 | HVAM | Hepatite A - Anti-HAV IgM | `__________` |
| 9 | QAU | Hepatite B - HBsAg (Antígeno de Superfície) | `__________` |
| 10 | QHBCM | Hepatite B - Anti-HBc IgM | `__________` |
| 11 | QHBCT | Hepatite B - Anti-HBc Total (IgG+IgM) | `__________` |
| 12 | QHBE | Hepatite B - Anti-HBe | `__________` |
| 13 | QHBEAG | Hepatite B - HBeAg | `__________` |
| 14 | QHCV | Hepatite C - Anti-HCV | `__________` |
| 15 | QHVAM | Hepatite A - Anti-HAV IgM | `__________` |

## Observações

- **Prefixo `Q`:** confirmar com a equipe que os pares `AU`/`QAU`, `HBCM`/`QHBCM`
  etc. são o **mesmo exame em metodologias diferentes** (ex.: ELISA vs.
  Quimioluminescência). Se forem, cada um pode ter um código Álvaro próprio (o
  Álvaro costuma ter códigos distintos por metodologia) — por isso a coluna é
  preenchida linha a linha, e não copiada do par.
- **Grafia:** o objetivo é padronizar (`Anti-HBc` em vez de `Anti - HBc`, acentuação
  e capitalização consistentes). Ajuste os nomes acima ao padrão oficial do Álvaro
  se a equipe preferir espelhar exatamente a nomenclatura do apoio.
- Marque cada linha como conferida antes de aplicar (`[x]`) para controle.
