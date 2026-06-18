"""Integração com a Evolution API (envio de documento PDF via WhatsApp).

Endpoint sendMedia retorna HTTP 201 Created no sucesso. Reaproveitável por
todas as plataformas. Nunca logar telefone/PII em texto claro.
"""

from __future__ import annotations

import base64
import logging
from pathlib import Path

import httpx

from src import config

log = logging.getLogger(__name__)


def _mascarar_tel(telefone: str) -> str:
    return "****" + telefone[-4:] if telefone and len(telefone) >= 4 else "****"


def enviar_documento_pdf(
    telefone: str,
    caminho_pdf: str,
    legenda: str | None = None,
    instancia: str | None = None,
    timeout: float = 60.0,
) -> bool:
    """Envia um PDF ao paciente. Retorna True se a Evolution responder 201.

    Lê base_url/api_key/instância da config (env). Não envia se DRY_RUN — o
    worker é quem decide; aqui apenas executamos a chamada real.
    """
    instancia = instancia or config.EVOLUTION_INSTANCE
    legenda = legenda if legenda is not None else config.LEGENDA_PADRAO
    pdf = Path(caminho_pdf)
    if not pdf.is_file():
        log.error("PDF inexistente para envio: %s", caminho_pdf)
        return False

    media_b64 = base64.b64encode(pdf.read_bytes()).decode("ascii")
    url = f"{config.EVOLUTION_BASE_URL}/message/sendMedia/{instancia}"
    payload = {
        "number": telefone,
        "mediatype": "document",
        "mimetype": "application/pdf",
        "fileName": pdf.name,
        "caption": legenda,
        "media": media_b64,
    }
    headers = {"apikey": config.EVOLUTION_API_KEY, "Content-Type": "application/json"}

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=timeout)
    except httpx.HTTPError as exc:
        log.error("Falha de rede ao enviar para %s: %s", _mascarar_tel(telefone), exc)
        return False

    if resp.status_code == 201:
        log.info("Enviado com sucesso para %s", _mascarar_tel(telefone))
        return True

    log.error(
        "Evolution retornou %s ao enviar para %s",
        resp.status_code,
        _mascarar_tel(telefone),
    )
    return False


def enviar_texto(
    telefone: str,
    texto: str,
    instancia: str | None = None,
    timeout: float = 30.0,
) -> bool:
    """Envia uma mensagem de texto ao paciente via Evolution API.

    Retorna True se a Evolution responder 201. Não decide DRY_RUN — o worker
    é quem controla (igual a enviar_documento_pdf).
    """
    instancia = instancia or config.EVOLUTION_INSTANCE
    url = f"{config.EVOLUTION_BASE_URL}/message/sendText/{instancia}"
    payload = {"number": telefone, "text": texto}
    headers = {"apikey": config.EVOLUTION_API_KEY, "Content-Type": "application/json"}

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=timeout)
    except httpx.HTTPError as exc:
        log.error(
            "Falha de rede ao enviar texto para %s: %s", _mascarar_tel(telefone), exc
        )
        return False

    if resp.status_code == 201:
        log.info("Texto enviado com sucesso para %s", _mascarar_tel(telefone))
        return True

    log.error(
        "Evolution retornou %s ao enviar texto para %s",
        resp.status_code,
        _mascarar_tel(telefone),
    )
    return False
