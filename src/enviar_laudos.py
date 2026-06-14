"""Worker de envio (cron). Monta a fila elegível e envia via Evolution API.

Reaproveitável por todas as plataformas. Loga uma linha RESUMO_ENVIO com
total/enviados/erros/dry_run. Nunca loga PII de paciente.
"""

from __future__ import annotations

import logging

from src import config, db
from src.whatsapp_evolution import enviar_documento_pdf

log = logging.getLogger(__name__)


def _mascarar_nome(nome: str) -> str:
    return (nome[:1] + "***") if nome else "***"


def processar_fila() -> dict:
    db.init_db()
    fila = db.listar_pendentes_envio()
    total = len(fila)
    enviados = erros = 0

    for row in fila:
        os_ = row["numero_os"]
        try:
            if config.DRY_RUN:
                log.info(
                    "[DRY_RUN] simularia envio os=%s paciente=%s",
                    os_,
                    _mascarar_nome(row["nome"]),
                )
                enviados += 1
                continue

            ok = enviar_documento_pdf(
                telefone=row["telefone"],
                caminho_pdf=row["caminho_pdf"],
                legenda=config.LEGENDA_PADRAO,
            )
            if ok:
                db.marcar_enviado(row["id"])
                enviados += 1
            else:
                erros += 1
        except Exception:  # noqa: BLE001
            erros += 1
            log.exception("Erro ao processar os=%s", os_)

    log.info(
        "RESUMO_ENVIO total=%d enviados=%d erros=%d dry_run=%d",
        total,
        enviados,
        erros,
        1 if config.DRY_RUN else 0,
    )
    return {"total": total, "enviados": enviados, "erros": erros,
            "dry_run": config.DRY_RUN}


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    processar_fila()
