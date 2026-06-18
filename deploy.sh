#!/usr/bin/env bash
# Deploy / atualização do laudos-whatsapp na VPS.
# Idempotente: pode rodar quantas vezes quiser. NÃO grava segredos — o .env
# é criado a partir do .env.example e preenchido por VOCÊ.
#
# Uso (na VPS, como root ou sudo):
#   REPO_URL=https://github.com/alexwaltersdorf/Automacao-Alavro.git \
#   BRANCH=main ./deploy.sh
set -euo pipefail

REPO_URL="${REPO_URL:?defina REPO_URL=https://github.com/<voce>/Automacao-Alavro.git}"
BRANCH="${BRANCH:-main}"
BASE="${BASE:-/opt/laudos-whatsapp}"
APP="$BASE/app"
ENV_FILE="$BASE/.env"
GROUP="laudosenv"

echo "==> Diretórios de dados em $BASE"
mkdir -p "$BASE"/{db,pdfs,logs}

echo "==> Grupo $GROUP (leitura do .env pelo container, uid 10001)"
getent group "$GROUP" >/dev/null || groupadd "$GROUP"

echo "==> Código em $APP (branch $BRANCH)"
if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch origin "$BRANCH"
  git -C "$APP" checkout "$BRANCH"
  git -C "$APP" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP"
fi

echo "==> .env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$APP/.env.example" "$ENV_FILE"
  chgrp "$GROUP" "$ENV_FILE"
  chmod 640 "$ENV_FILE"
  echo "    >>> .env criado a partir do exemplo. PREENCHA OS SEGREDOS:"
  echo "    >>>   nano $ENV_FILE"
  echo "    >>> e rode ./deploy.sh de novo."
  exit 2
fi
chgrp "$GROUP" "$ENV_FILE"; chmod 640 "$ENV_FILE"

echo "==> Permissões dos dados"
chgrp -R "$GROUP" "$BASE"/{db,pdfs}
chmod -R 770 "$BASE"/{db,pdfs}

echo "==> Build + up (docker compose)"
cd "$APP"
docker compose up -d --build

echo "==> Status"
docker compose ps

cat <<EOF

==> Pronto. Próximos passos:
  - Webapp: deve responder em https://<seu-dominio> (ajuste o Host no docker-compose.yml).
  - Cron dos coletores/envio (rode 1x para registrar):
      (crontab -l 2>/dev/null; \\
       echo "*/10 * * * * $APP/run.sh -m src.coletores.coletor_neomed >> $BASE/logs/coletor.log 2>&1"; \\
       echo "*/5  * * * * $APP/run.sh -m src.enviar_laudos          >> $BASE/logs/envio.log   2>&1") | crontab -
  - DRY_RUN=1 até você validar; troque para 0 no .env quando autorizar o envio real.
EOF
