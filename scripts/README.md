# scripts

## verifica-negativas-google-ads.py

Simula a correspondência de negativas do Google Ads contra termos de busca, para
descobrir quais termos com gasto **não** estão bloqueados pelas negativas já
existentes na campanha.

Existe porque a análise de desperdício em Ads é fácil de errar: um termo caro no
relatório dos últimos 30 dias pode já estar bloqueado desde a semana passada, e
propor negativa para ele é ruído. Este script separa os dois casos.

Semântica implementada, igual à do Google:

- `PHRASE` bloqueia quando as palavras da negativa aparecem **em sequência**;
- `BROAD` bloqueia quando **todas** as palavras aparecem, em qualquer ordem;
- `EXACT` bloqueia só o termo idêntico;
- acentuação é normalizada antes da comparação (`ressonancia` bloqueia `ressonância`);
- não há stemming — negativas do Google não casam variantes próximas, então
  `obstetra` **não** bloqueia `obstétrico`.

### Uso

O primeiro argumento é o JSON do Windsor.ai com as negativas da conta:

```
get_data(connector="google_ads", fields="campaign_id,campaign_criterion_keyword_text,
         campaign_criterion_keyword_match_type,campaign_criterion_negative")
```

Os termos a testar vêm por stdin, um por linha, no formato
`APELIDO_CAMPANHA|gasto|conversoes|termo`:

```
python3 scripts/verifica-negativas-google-ads.py negativas.json << 'DATA'
MAPS|43.17|0|ultrassom caraguatatuba
MAPS|21.32|0|hemograma completo
DATA
```

Saída: cada termo marcado como `ok: <negativa que o bloqueia>` ou
`<<< NAO BLOQUEADO`, e o total gasto no que escapou.

O dicionário `CID` no topo do script mapeia apelidos para IDs de campanha da
conta 920-715-3288 — ajuste ao usar em outra conta.
