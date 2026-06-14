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
    "SESSION_SECRET",
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
SESSION_SECRET = os.environ["SESSION_SECRET"]

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
