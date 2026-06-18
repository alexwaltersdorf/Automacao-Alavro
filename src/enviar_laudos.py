"""Worker de envio (cron). Monta a fila elegível e envia via Evolution API.

Reaproveitável por todas as plataformas. Loga uma linha RESUMO_ENVIO com
total/processados/enviados/erros/avaliacoes/limite/dry_run. Nunca loga PII.

Canário (envio controlado): aceita um limite de laudos por rodada via
--limit N (CLI) ou LIMITE_ENVIO=N (env). Quando >0, processa no máximo N
laudos da fila liberada e para; quando ausente/0, processa toda a fila.
"""

from __future__ import annotations

import argparse
import logging
import os

from src import config, db
from src.whatsapp_evolution import enviar_documento_pdf, enviar_texto

log = logging.getLogger(__name__)


def _mascarar_nome(nome: str) -> str:
    return (nome[:1] + "***") if nome else "***"


def _resolver_limite(arg_limite: int | None) -> int:
    """Resolve o limite do canário: --limit (CLI) tem precedência sobre
    LIMITE_ENVIO (env). Valor ausente/inválido/<=0 => 0 (sem limite)."""
    if arg_limite is not None:
        return arg_limite if arg_limite > 0 else 0
    bruto = os.environ.get("LIMITE_ENVIO", "").strip()
    if not bruto:
        return 0
    try:
        valor = int(bruto)
    except ValueError:
        log.warning("LIMITE_ENVIO inválido (%r); ignorando (sem limite)", bruto)
        return 0
    return valor if valor > 0 else 0


def processar_fila(limite: int | None = None) -> dict:
    """Processa a fila liberada. Se `limite` > 0, processa no máximo `limite`
    laudos (canário) — conta laudos efetivamente processados (tentativa de
    envio do PDF), não a fila inteira. Em DRY_RUN respeita o limite e só simula.
    """
    limite = limite or 0
    db.init_db()
    fila = db.listar_pendentes_envio()
    total = len(fila)
    enviados = erros = avaliacoes = processados = 0

    if limite > 0:
        log.info(
            "[CANARIO] limite=%d: processando no máximo %d laudo(s) de %d na fila",
            limite,
            limite,
            total,
        )

    for row in fila:
        if limite > 0 and processados >= limite:
            log.info("[CANARIO] limite=%d atingido; parando a rodada", limite)
            break
        os_ = row["numero_os"]
        processados += 1
        try:
            if config.DRY_RUN:
                log.info(
                    "[DRY_RUN] simularia envio os=%s paciente=%s",
                    os_,
                    _mascarar_nome(row["nome"]),
                )
                if not row["avaliacao_enviada"]:
                    log.info("[DRY_RUN] simularia avaliação os=%s", os_)
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
                # 2ª mensagem: avaliação Google (só se ainda não enviada).
                # Falha aqui não afeta o status do laudo nem a contagem de erros.
                if not row["avaliacao_enviada"]:
                    try:
                        ok_av = enviar_texto(
                            telefone=row["telefone"],
                            texto=config.MENSAGEM_AVALIACAO,
                        )
                        if ok_av:
                            db.marcar_avaliacao_enviada(row["id"])
                            avaliacoes += 1
                        else:
                            log.warning(
                                "Avaliação não enviada (Evolution recusou) os=%s", os_
                            )
                    except Exception:  # noqa: BLE001
                        log.exception("Erro ao enviar avaliação os=%s", os_)
            else:
                erros += 1
        except Exception:  # noqa: BLE001
            erros += 1
            log.exception("Erro ao processar os=%s", os_)

    log.info(
        "RESUMO_ENVIO total=%d processados=%d enviados=%d erros=%d "
        "avaliacoes=%d limite=%d dry_run=%d",
        total,
        processados,
        enviados,
        erros,
        avaliacoes,
        limite,
        1 if config.DRY_RUN else 0,
    )
    return {
        "total": total,
        "processados": processados,
        "enviados": enviados,
        "erros": erros,
        "avaliacoes": avaliacoes,
        "limite": limite,
        "dry_run": config.DRY_RUN,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    parser = argparse.ArgumentParser(
        description="Worker de envio de laudos (com canário opcional)."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Canário: processa no máximo N laudos por rodada (>0). "
        "Sobrepõe LIMITE_ENVIO. Ausente/0 => processa toda a fila.",
    )
    args = parser.parse_args()
    processar_fila(limite=_resolver_limite(args.limit))
