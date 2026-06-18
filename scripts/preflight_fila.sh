#!/usr/bin/env bash
# =============================================================================
# preflight_fila.sh — inspeção segura da fila de laudos (SOMENTE LEITURA)
#
# O que faz:
#   1. Lê DB_PATH do .env (fallback: /opt/laudos-whatsapp/db/laudos.db).
#   2. Imprime o tamanho da fila liberada e a distribuição de telefones.
#   3. Simula o worker com DRY_RUN=1 --limit 1 (nada é enviado de verdade).
#
# Garantias:
#   - NUNCA envia mensagens (DRY_RUN=1 forçado no script).
#   - NUNCA altera .env, banco ou qualquer arquivo.
#   - NUNCA inclui DRY_RUN=0 nem comandos destrutivos.
#
# Dependências: python3 (já exigido pelo projeto); sqlite3 CLI não é necessário.
#
# Como rodar na VPS:
#   cd /opt/laudos-whatsapp          # diretório do projeto
#   bash scripts/preflight_fila.sh
# =============================================================================
set -euo pipefail

# ── Cores (desabilitadas se não for terminal) ─────────────────────────────────
if [ -t 1 ]; then
    BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
    RED='\033[0;31m'; CYAN='\033[0;36m'; RESET='\033[0m'
else
    BOLD=''; GREEN=''; YELLOW=''; RED=''; CYAN=''; RESET=''
fi

# ── Localização do projeto (cwd ou diretório do próprio script) ───────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"
DEFAULT_DB="/opt/laudos-whatsapp/db/laudos.db"

separator() { echo -e "${CYAN}──────────────────────────────────────────────${RESET}"; }

echo ""
echo -e "${BOLD}🔍  PRÉ-VOO DA FILA DE LAUDOS  (somente leitura)${RESET}"
separator

# ── 1) Verifica .env ──────────────────────────────────────────────────────────
if [ ! -f "${ENV_FILE}" ]; then
    echo -e "${RED}ERRO: .env não encontrado em ${ENV_FILE}${RESET}"
    echo "  Certifique-se de rodar o script a partir do diretório do projeto"
    echo "  ou que o arquivo .env existe nesse diretório."
    exit 1
fi

# Extrai DB_PATH do .env (ignora comentários e linhas em branco)
DB_PATH_ENV=$(grep -E '^[[:space:]]*DB_PATH=' "${ENV_FILE}" | head -1 \
    | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs 2>/dev/null || true)
DB_PATH="${DB_PATH_ENV:-${DEFAULT_DB}}"

echo -e "  .env encontrado : ${ENV_FILE}"
echo -e "  DB_PATH         : ${DB_PATH}"

# ── 2) Verifica banco ─────────────────────────────────────────────────────────
if [ ! -f "${DB_PATH}" ]; then
    echo -e "${RED}ERRO: banco de dados não encontrado em ${DB_PATH}${RESET}"
    echo "  Verifique DB_PATH no .env ou se o container/serviço já rodou ao menos"
    echo "  uma vez para criar o banco."
    exit 1
fi

# ── 3) Inspeciona a fila via Python (somente leitura, sem alterar o banco) ────
separator
echo -e "${BOLD}📋  Fila liberada (pronta para envio)${RESET}"
echo ""

python3 - "${DB_PATH}" <<'PYEOF'
import sqlite3, sys

db_path = sys.argv[1]

try:
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
except sqlite3.OperationalError as e:
    print(f"  ERRO ao abrir o banco (read-only): {e}")
    sys.exit(1)

def q(sql, *params):
    return conn.execute(sql, params).fetchone()[0]

FILA = (
    "status_envio='pendente' AND pronto_para_envio=1 "
    "AND telefone IS NOT NULL AND telefone!='' "
    "AND caminho_pdf IS NOT NULL AND caminho_pdf!=''"
)

total      = q(f"SELECT COUNT(*) FROM pacientes WHERE {FILA}")
sem_tel    = q("SELECT COUNT(*) FROM pacientes WHERE status_envio='pendente' "
               "AND pronto_para_envio=1 AND (telefone IS NULL OR telefone='')")
av_pend    = q(f"SELECT COUNT(*) FROM pacientes WHERE {FILA} "
               "AND COALESCE(avaliacao_enviada,0)=0")
av_feita   = q(f"SELECT COUNT(*) FROM pacientes WHERE {FILA} "
               "AND COALESCE(avaliacao_enviada,0)=1")

print(f"  {'Laudos liberados (total)':<42} {total:>5}")
print(f"  {'  → aguardando avaliação (avaliacao_enviada=0)':<42} {av_pend:>5}")
print(f"  {'  → avaliação já enviada (avaliacao_enviada=1)':<42} {av_feita:>5}")
print(f"  {'Sem telefone (não entram na fila)':<42} {sem_tel:>5}")

if total == 0:
    print("\n  ⚠  Fila está vazia — nenhum laudo elegível para envio.")

conn.close()
PYEOF

# ── 4) Simulação DRY_RUN=1 --limit 1 ────────────────────────────────────────
separator
echo -e "${BOLD}🧪  Simulação do canário (DRY_RUN=1 --limit 1) — nenhum envio real${RESET}"
echo ""

# DRY_RUN=1 é forçado explicitamente; precede qualquer valor no .env.
cd "${PROJECT_DIR}"
DRY_RUN=1 python3 -m src.enviar_laudos --limit 1 2>&1 \
    | grep -E '\[CANARIO\]|\[DRY_RUN\]|RESUMO_ENVIO|ERROR|WARNING' \
    || echo -e "${YELLOW}  (nenhuma linha relevante — fila pode estar vazia)${RESET}"

separator
echo -e "${GREEN}✓  Pré-voo concluído. Nenhum dado foi alterado.${RESET}"
echo ""
echo -e "  Para enviar 1 laudo de verdade (canário real), execute MANUALMENTE:"
echo -e "  ${BOLD}  DRY_RUN=0 python3 -m src.enviar_laudos --limit 1${RESET}"
echo ""
