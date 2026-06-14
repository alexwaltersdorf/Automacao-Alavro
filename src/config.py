"""Carrega e valida a configuração a partir do .env do diretório do projeto.

Regras:
- Segredos vêm SOMENTE de variáveis de ambiente (.env), nunca hardcode.
- Variáveis obrigatórias ausentes -> sys.exit(1) com mensagem clara.
- python-dotenv é obrigatório; sem ele, avisamos em vez de cair num no-op
  silencioso (lição aprendida no container do Álvaro).
"""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

# Diretório raiz do projeto (onde fica o .env em desenvolvimento).
PROJECT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = PROJECT_DIR / ".env"

try:
    from dotenv import load_dotenv

    load_dotenv(ENV_PATH)
except ImportError:  # pragma: no cover
    # NÃO silenciar: sem python-dotenv o .env não é lido e tudo "falta".
    print(
        "AVISO: python-dotenv não instalado; .env NÃO carregado. "
        "Garanta python-dotenv no requirements/container.",
        file=sys.stderr,
    )

# Variáveis obrigatórias para o sistema funcionar.
OBRIGATORIAS = [
    "DB_PATH",
    "PDF_DIR",
    "EVOLUTION_BASE_URL",
    "EVOLUTION_API_KEY",
    "EVOLUTION_INSTANCE",
    "WEBAPP_USER",
    "WEBAPP_PASSWORD_HASH",
    # SESSION_SECRET é validado à parte (aceita fallback WEBAPP_SECRET).
]


def _exigir(nomes: list[str]) -> None:
    faltando = [n for n in nomes if not os.environ.get(n)]
    if faltando:
        print(
            "ERRO de configuração: variáveis de ambiente obrigatórias ausentes: "
            + ", ".join(faltando)
            + f"\nPreencha-as no .env ({ENV_PATH}).",
            file=sys.stderr,
        )
        sys.exit(1)


_exigir(OBRIGATORIAS)

# --- Valores derivados (sem segredos expostos em log) -----------------------
DB_PATH = os.environ["DB_PATH"]
PDF_DIR = os.environ["PDF_DIR"]

EVOLUTION_BASE_URL = os.environ["EVOLUTION_BASE_URL"].rstrip("/")
EVOLUTION_API_KEY = os.environ["EVOLUTION_API_KEY"]
EVOLUTION_INSTANCE = os.environ["EVOLUTION_INSTANCE"]

WEBAPP_USER = os.environ["WEBAPP_USER"]
WEBAPP_PASSWORD_HASH = os.environ["WEBAPP_PASSWORD_HASH"].strip().lower()

# Segredo de sessão: aceita o nome novo (SESSION_SECRET) OU o antigo do .env de
# produção do Álvaro (WEBAPP_SECRET) — sem precisar editar o .env de produção.
SESSION_SECRET = os.environ.get("SESSION_SECRET") or os.environ.get("WEBAPP_SECRET")
if not SESSION_SECRET:
    print(
        "ERRO de configuração: defina SESSION_SECRET (ou WEBAPP_SECRET) no .env "
        f"({ENV_PATH}).",
        file=sys.stderr,
    )
    sys.exit(1)

# --- Variáveis do Álvaro (scrapers do vault) --------------------------------
# Re-exportadas como nomes importáveis para `from src.config import ALVARO_*`.
# OPCIONAIS: quem não usa o Álvaro não é bloqueado; ficam None se ausentes.
ALVARO_BASE_URL = os.environ.get("ALVARO_BASE_URL")
ALVARO_EMAIL = os.environ.get("ALVARO_EMAIL")
ALVARO_SENHA = os.environ.get("ALVARO_SENHA")
ALVARO_LAB_ID = os.environ.get("ALVARO_LAB_ID")

# DRY_RUN: 1 (default) = simulação; 0 = envia de verdade.
DRY_RUN = os.environ.get("DRY_RUN", "1").strip() not in ("0", "false", "False", "")

# Legenda padrão enviada junto ao PDF.
LEGENDA_PADRAO = os.environ.get(
    "LEGENDA_PADRAO",
    "Olá! Segue em anexo o resultado do seu exame. Em caso de dúvidas, "
    "procure a unidade de atendimento.",
)


def senha_confere(senha: str) -> bool:
    """Compara a senha do login da webapp com o hash SHA-256 do .env."""
    import hmac

    calc = hashlib.sha256(senha.encode("utf-8")).hexdigest()
    return hmac.compare_digest(calc, WEBAPP_PASSWORD_HASH)
