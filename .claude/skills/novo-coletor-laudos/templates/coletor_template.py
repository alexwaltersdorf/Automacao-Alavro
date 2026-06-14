"""Coletor de laudos — TEMPLATE.

Copie para src/coletores/coletor_<slug>.py e implemente o portal concreto.

CONTRATO (igual para TODA plataforma):
    coletar_laudos() -> list[dict]
    cada dict EXATAMENTE com as chaves:
        nome, cpf, numero_os, data_exame, caminho_pdf
    (acrescente "portal" e "instancia_evolution" se a unidade tiver
     múltiplos portais e for preciso rotear o envio por instância)
    Cada PDF salvo dentro de PDF_DIR; caminho_pdf aponta para o arquivo.

REGRAS INEGOCIÁVEIS:
    - Credenciais SÓ via variáveis de ambiente (nunca hardcode, nunca em log).
    - Logs SEM PII (mascarar nome/cpf; logar contagens, não dados).
    - Idempotência: não re-baixar laudo já coletado (cheque por numero_os).
    - Prefira API oficial a scraping com Playwright quando o portal oferecer.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

# from src import config  # PDF_DIR, e demais paths/flags vêm da config comum

log = logging.getLogger(__name__)

# --- Identidade do portal (preencher por plataforma) ------------------------
SLUG = "TODO"  # ex.: "alvaro"

# Nomes das variáveis de ambiente esperadas (valores ficam no .env do usuário).
ENV_URL = f"{SLUG.upper()}_URL"
ENV_LABID = f"{SLUG.upper()}_LABID"        # pré-auth opcional (ex.: Álvaro)
ENV_USER = f"{SLUG.upper()}_USER"
ENV_PASSWORD = f"{SLUG.upper()}_PASSWORD"
ENV_EVOLUTION_INSTANCE = f"{SLUG.upper()}_EVOLUTION_INSTANCE"


def _mascarar_nome(nome: str) -> str:
    return (nome[:1] + "***") if nome else "***"


def _env(nome: str, obrigatorio: bool = True) -> str | None:
    valor = os.environ.get(nome)
    if obrigatorio and not valor:
        raise RuntimeError(f"Variável de ambiente obrigatória ausente: {nome}")
    return valor


def _autenticar():
    """Login no portal.

    Aplique a pré-autenticação (LabId/tenant/código de unidade) ANTES do
    usuário/senha, se o portal exigir. Use Playwright OU httpx (API oficial).
    NUNCA logue os valores das credenciais.
    """
    url = _env(ENV_URL)
    labid = _env(ENV_LABID, obrigatorio=False)  # só se o portal tiver pré-auth
    user = _env(ENV_USER)
    password = _env(ENV_PASSWORD)
    _ = (url, labid, user, password)
    raise NotImplementedError("Implementar login do portal " + SLUG)


def _listar_laudos_prontos(sessao) -> list[dict]:
    """Lista exames prontos para download.

    Trate paginação/filtro por data conforme o portal. Extraia os 4 metadados
    obrigatórios da tela ou do PDF (pdfplumber/pypdf):
        nome, cpf, numero_os, data_exame
    """
    raise NotImplementedError("Implementar listagem do portal " + SLUG)


def _baixar_pdf(sessao, item: dict, destino: Path) -> Path:
    """Baixa o PDF do laudo para `destino` dentro de PDF_DIR.

    O download pode ser direto, via link temporário, iframe ou geração sob
    demanda (token/QR). Retorna o caminho final do arquivo salvo.
    """
    raise NotImplementedError("Implementar download do portal " + SLUG)


def _ja_coletado(numero_os: str) -> bool:
    """Idempotência: True se este laudo (por numero_os) já foi coletado."""
    # Consultar db.py (função comum) — não reimplementar acesso ao banco aqui.
    return False


def coletar_laudos() -> list[dict]:
    """Ponto de entrada do contrato. Retorna registros normalizados."""
    pdf_dir = Path(os.environ["PDF_DIR"])  # ou config.PDF_DIR
    pdf_dir.mkdir(parents=True, exist_ok=True)
    instancia = _env(ENV_EVOLUTION_INSTANCE, obrigatorio=False)

    sessao = _autenticar()
    coletados: list[dict] = []
    novos = erros = 0

    for item in _listar_laudos_prontos(sessao):
        numero_os = item["numero_os"]
        if _ja_coletado(numero_os):
            continue
        try:
            destino = pdf_dir / f"{SLUG}_{numero_os}.pdf"
            caminho = _baixar_pdf(sessao, item, destino)
            coletados.append(
                {
                    "nome": item["nome"],
                    "cpf": item["cpf"],
                    "numero_os": numero_os,
                    "data_exame": item["data_exame"],
                    "caminho_pdf": str(caminho),
                    # roteamento multi-portal (opcional):
                    "portal": SLUG,
                    "instancia_evolution": instancia,
                }
            )
            novos += 1
            log.info("Laudo coletado os=%s paciente=%s", numero_os,
                     _mascarar_nome(item["nome"]))
        except Exception:  # noqa: BLE001
            erros += 1
            log.exception("Falha ao coletar os=%s", numero_os)

    log.info("RESUMO_COLETA portal=%s novos=%d erros=%d", SLUG, novos, erros)
    return coletados


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    coletar_laudos()
