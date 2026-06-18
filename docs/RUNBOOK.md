# RUNBOOK — Operações de Infraestrutura (VPS Laudos Álvaro/Neomed)

> Cópia versionada do runbook operacional. **GitHub é a fonte da verdade**; o
> vault Syncthing é a cópia de execução na VPS. Mantenha este arquivo e a seção
> equivalente em `.claude/skills/novo-coletor-laudos/SKILL.md` sincronizados.

## 1. Ambiente

- **Hostinger VPS** (ID 1554023), Ubuntu 24.04, 3.8 GB RAM, swap 2 GB, disco ~71%.
- App de envio de laudos (Álvaro + Neomed) via WhatsApp.
- Containers: `laudos-webapp-1`, Evolution API, Syncthing.

### Caminhos

| Item | Caminho |
|------|---------|
| Código (vault) | `/var/lib/docker/volumes/syncthing-dxoj_syncthing-data/_data/srv/obsidian-vault/OpenClaw/projetos/laudos-whatsapp` |
| Montagem no container | `/app/src` (somente leitura) |
| `.env` | `/opt/laudos-whatsapp/.env` |
| Banco | `/opt/laudos-whatsapp/db/laudos.db` |
| PDFs | `/opt/laudos-whatsapp/pdfs/` |
| Config Syncthing | `_data/config/config.xml` |
| API Syncthing | `localhost:32771` |
| Folder ID | `2ms7r-wd97x` |

## 2. Swap (concluído)

`fallocate 2G` → `chmod 600` → `mkswap` → `swapon` → persistido em `fstab` →
`vm.swappiness=10`.

## 3. Regra de sincronização (também na Skill)

- **GitHub fonte da verdade** → branch → PR → **merge** antes de chegar ao
  vault/produção.
- **NÃO sincronizar** `.env`, DB, PDFs ou logs (segredos/LGPD).
- Módulos que só existem no vault (`scraper_alvaro.py`, `scraper_api.py`,
  `status_laudos.py`) **não sobrescrever** no deploy antes de trazê-los ao repo.
- Sempre verificar Syncthing **"Em sincronia"** e **sem** `.syncthing.*.tmp`
  antes de recriar o container.

## 4. Correção de sincronização (histórico)

- **Causa raiz:** erros de `chmod` (`operation not permitted`,
  `ignorePerms=false`).
- **Aplicado:** `ignorePerms=true` via API, rescan, `.stignore` criado
  (`__pycache__`, `*.pyc`, `*.pyo`, `.venv`, `*.tmp`, `*.bak-*`, etc.), limpeza
  de `__pycache__`.
- **Estado final:** `completion=100`, `errors=0`, `state=idle`.

## 5. Envio real (DRY_RUN) — ⚠️ ação irreversível

- `DRY_RUN=0` em `/opt/laudos-whatsapp/.env` faz o **cron (07h UTC, Seg–Sex)**
  enviar os laudos liberados **de verdade** (mensagens reais com PII).
- **NÃO alterar** `DRY_RUN` sem autorização explícita do usuário.
- **Decisão (2026-06-16):** envio real **autorizado** pelo usuário.

### Procedimento de ativação segura

1. **Pré-voo** — conferir a fila elegível (sem expor PII além do necessário):
   ```bash
   DB=/opt/laudos-whatsapp/db/laudos.db
   sqlite3 "$DB" "SELECT COUNT(*) AS fila FROM pacientes
     WHERE status_envio='pendente' AND pronto_para_envio=1
       AND telefone!='' AND caminho_pdf!='';"
   # telefones suspeitos (curtos) entre os liberados:
   sqlite3 "$DB" "SELECT numero_os, length(telefone) FROM pacientes
     WHERE status_envio='pendente' AND pronto_para_envio=1 AND length(telefone)<12;"
   ```
2. **Backup** do `.env` e do DB antes de mexer.
3. **Ativar:** definir `DRY_RUN=0` em `/opt/laudos-whatsapp/.env`.
4. **Disparo supervisionado** (preferir ao cron às cegas): rodar o worker
   manualmente uma vez e observar `RESUMO_ENVIO`:
   ```bash
   /opt/laudos-whatsapp/app/run.sh -m src.enviar_laudos
   ```
   O `.env` é lido a cada execução do worker; o cron usará o novo valor
   automaticamente. A webapp não envia, então não exige restart.
5. Conferir status pós-envio: `SELECT status_envio, COUNT(*) ... GROUP BY 1`.
