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

## 5. Pendência (aguardando decisão) — ⚠️ envio real

- `DRY_RUN=0` em `/opt/laudos-whatsapp/.env` faz o **cron (07h UTC, Seg–Sex)**
  enviar os **21 laudos liberados de verdade**.
- **NÃO alterar** `DRY_RUN` sem autorização explícita.
