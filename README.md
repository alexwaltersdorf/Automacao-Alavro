# Automacao-Alavro — laudos-whatsapp

Coleta laudos de exames (PDF) de portais de origem, permite que um operador
cadastre/valide o telefone do paciente numa webapp (gate humano) e envia o PDF
via WhatsApp (Evolution API), com cron e monitoramento — sem expor PII.

> **Princípio:** só o **coletor** muda por plataforma. Todo o resto é
> reaproveitável. Para adicionar um portal use a skill `/novo-coletor-laudos`.

## Plataformas

| Slug | Portal | Método | CPF na listagem |
|------|--------|--------|-----------------|
| `neomed` | Neomed (app.neomed.tech) | Playwright | não (CPF opcional) |

## Estrutura

```
src/
  config.py              # carrega/valida .env (sys.exit(1) se faltar var)
  db.py                  # SQLite, tabela `pacientes`, fila de envio
  whatsapp_evolution.py  # enviar_documento_pdf() via Evolution API (201)
  enviar_laudos.py       # worker (cron): monta fila e envia; loga RESUMO_ENVIO
  coletores/
    coletor_neomed.py    # coletor Neomed (contrato coletar_laudos())
  webapp/
    app.py               # FastAPI: login, listagem c/ filtros, cadastro telefone
    templates/           # login.html, lista.html
Dockerfile, docker-compose.yml, run.sh, requirements.txt, .env.example
config/portais.example.yaml
```

## Setup (desenvolvimento)

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium       # só para coletar do Neomed
cp .env.example .env                         # preencha os valores (segredos!)
```

Gere os segredos da webapp:

```bash
# hash da senha do operador
python -c "import hashlib,getpass;print(hashlib.sha256(getpass.getpass().encode()).hexdigest())"
# segredo de sessão
python -c "import secrets;print(secrets.token_hex(32))"
```

## Uso

```bash
# Coletar laudos do Neomed (gate fechado: entra como pendente/não-pronto)
./run.sh -m src.coletores.coletor_neomed

# Subir a webapp para o operador cadastrar telefone e liberar envio
uvicorn src.webapp.app:app --host 0.0.0.0 --port 8000

# Worker de envio (DRY_RUN=1 simula; DRY_RUN=0 envia de verdade)
./run.sh -m src.enviar_laudos
```

### Cron (exemplo)

```
*/10 * * * * /opt/laudos-whatsapp/run.sh -m src.coletores.coletor_neomed >> /opt/laudos-whatsapp/logs/coletor.log 2>&1
*/5  * * * * /opt/laudos-whatsapp/run.sh -m src.enviar_laudos          >> /opt/laudos-whatsapp/logs/envio.log 2>&1
```

## Segurança / LGPD (inegociável)

- Segredos só no `.env` (gitignored, fora do Syncthing), digitados pelo usuário.
- PII sempre mascarada em logs; nunca commitada.
- Gate humano obrigatório: nada é enviado sem telefone + PDF + liberação manual.
- `DRY_RUN=1` em desenvolvimento; envio real só com autorização explícita.
