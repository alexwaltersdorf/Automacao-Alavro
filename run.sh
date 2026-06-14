#!/usr/bin/env bash
# Wrapper para cron/CLI: carrega o .env, exporta PYTHONPATH e executa Python
# do virtualenv do runtime. Uso: ./run.sh -m src.coletores.coletor_neomed
set -euo pipefail

# Diretório do código (este script). Em produção o código vive no vault.
VAULT="${VAULT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
RUNTIME="${RUNTIME:-/opt/laudos-whatsapp}"

# Carrega variáveis do .env (do runtime; fora do Syncthing).
ENV_FILE="${ENV_FILE:-$RUNTIME/.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

export PYTHONPATH="$VAULT"
cd "$VAULT"

# Usa o python do venv do runtime se existir; senão, o python do PATH.
PY="$RUNTIME/.venv/bin/python"
[ -x "$PY" ] || PY="python3"

exec "$PY" "$@"
