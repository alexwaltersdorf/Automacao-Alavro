"""Coletor de laudos — plataforma Neomed (https://app.neomed.tech).

Contrato comum:
    coletar_laudos() -> list[dict] com chaves
        nome, cpf, numero_os, data_exame, caminho_pdf
    e PDFs salvos em PDF_DIR.

Fluxo Neomed (scraping com Playwright — não há API oficial conhecida):
    1. login em /sign-in (e-mail + senha; SEM pré-autenticação).
    2. ir para "Exames Laudados".
    3. para cada card pronto (ignorando "reprocessado"/"recusado"):
       extrair #OS, nome e data ("Envio de exame: dd/mm/aaaa hh:mm");
       abrir o menu de 3 pontos -> "Baixar" -> salvar PDF em PDF_DIR.

Observações de modelagem (decisões confirmadas):
    - CPF NÃO aparece na listagem -> fica vazio (opcional nesta plataforma).
    - Instância do Evolution é compartilhada pela unidade -> sem roteamento
      por portal; gravamos portal='neomed' apenas para rastreio/filtro.

Segurança/LGPD: credenciais SÓ via .env; logs sem PII (nome mascarado);
idempotência por numero_os.
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path

from src import config, db

log = logging.getLogger(__name__)

PORTAL = "neomed"

# Variáveis de ambiente esperadas (valores no .env, preenchidos pelo usuário).
ENV_URL = "NEOMED_URL"           # ex.: https://app.neomed.tech/sign-in
ENV_USER = "NEOMED_USER"
ENV_PASSWORD = "NEOMED_PASSWORD"
# Overrides opcionais de seletores, para ajustar sem mexer no código.
ENV_HEADLESS = "NEOMED_HEADLESS"

# Estados que indicam que o laudo NÃO está pronto para download/envio.
ESTADOS_IGNORAR = ("reprocess", "recus")

# #OMV875961 | NOME DO PACIENTE
RE_OS = re.compile(r"#\s*([A-Z0-9]+)")
RE_DATA = re.compile(r"(\d{2}/\d{2}/\d{4})")


def _mascarar_nome(nome: str) -> str:
    return (nome[:1] + "***") if nome else "***"


def _env(nome: str, obrigatorio: bool = True) -> str | None:
    valor = os.environ.get(nome)
    if obrigatorio and not valor:
        raise RuntimeError(f"Variável de ambiente obrigatória ausente: {nome}")
    return valor


def _data_iso(texto: str) -> str:
    """Converte 'dd/mm/aaaa' (primeira ocorrência) em ISO 'aaaa-mm-dd'."""
    m = RE_DATA.search(texto or "")
    if not m:
        return ""
    d, mth, y = m.group(1).split("/")
    return f"{y}-{mth}-{d}"


def _parse_card(texto: str) -> dict | None:
    """Extrai os metadados visíveis de um card de exame laudado."""
    estado = texto.lower()
    if any(s in estado for s in ESTADOS_IGNORAR):
        return None
    m_os = RE_OS.search(texto)
    if not m_os:
        return None
    numero_os = m_os.group(1)
    # Nome: o que vem depois de "| ..." na primeira linha.
    nome = ""
    if "|" in texto:
        primeira_linha = texto.splitlines()[0]
        if "|" in primeira_linha:
            nome = primeira_linha.split("|", 1)[1].strip()
    data_exame = _data_iso(texto)
    return {
        "numero_os": numero_os,
        "nome": nome,
        "cpf": "",  # não disponível na listagem
        "data_exame": data_exame,
        "portal": PORTAL,
    }


def coletar_laudos() -> list[dict]:
    """Ponto de entrada do contrato. Faz login, baixa PDFs novos e retorna
    a lista normalizada (apenas os ainda não coletados)."""
    # Import tardio: Playwright só é necessário em ambiente com browser.
    from playwright.sync_api import sync_playwright

    url = _env(ENV_URL)
    user = _env(ENV_USER)
    password = _env(ENV_PASSWORD)
    headless = os.environ.get(ENV_HEADLESS, "1") not in ("0", "false", "False")

    pdf_dir = Path(config.PDF_DIR)
    pdf_dir.mkdir(parents=True, exist_ok=True)

    coletados: list[dict] = []
    novos = ignorados = erros = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        ctx = browser.new_context(accept_downloads=True)
        page = ctx.new_page()
        try:
            # --- Login (sem pré-autenticação) -------------------------------
            page.goto(url, wait_until="networkidle")
            page.get_by_role("textbox", name=re.compile("e-?mail", re.I)).first.fill(
                user
            )
            page.locator("input[type='password']").first.fill(password)
            page.get_by_role(
                "button", name=re.compile("entrar|sign in|login|acessar", re.I)
            ).first.click()
            page.wait_for_load_state("networkidle")

            # --- Ir para "Exames Laudados" ----------------------------------
            alvo = page.get_by_text(re.compile("exames? laudados?", re.I)).first
            if alvo.count():
                alvo.click()
                page.wait_for_load_state("networkidle")

            # --- Iterar os cards de exames ----------------------------------
            cards = page.locator(
                "xpath=//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', "
                "'abcdefghijklmnopqrstuvwxyz'), 'envio de exame')]"
            )
            n = cards.count()
            log.info("RESUMO_LISTAGEM portal=%s cards=%d", PORTAL, n)

            for i in range(n):
                card = cards.nth(i)
                texto = (card.inner_text() or "").strip()
                rec = _parse_card(texto)
                if rec is None:
                    ignorados += 1
                    continue
                if db.existe_os(rec["numero_os"]):
                    continue
                try:
                    # Abrir menu de 3 pontos dentro do card e clicar em "Baixar".
                    menu = card.locator(
                        "xpath=.//button[contains(@class,'menu') or "
                        "contains(@aria-label,'menu')] | .//*[@role='button']"
                    ).last
                    menu.click()
                    with page.expect_download() as dl_info:
                        page.get_by_text(re.compile(r"^\s*baixar\s*$", re.I)).first.click()
                    download = dl_info.value
                    destino = pdf_dir / f"{PORTAL}_{rec['numero_os']}.pdf"
                    download.save_as(str(destino))
                    rec["caminho_pdf"] = str(destino)
                    coletados.append(rec)
                    novos += 1
                    log.info(
                        "Laudo coletado os=%s paciente=%s",
                        rec["numero_os"],
                        _mascarar_nome(rec["nome"]),
                    )
                except Exception:  # noqa: BLE001
                    erros += 1
                    log.exception("Falha ao baixar os=%s", rec["numero_os"])
        finally:
            ctx.close()
            browser.close()

    log.info(
        "RESUMO_COLETA portal=%s novos=%d ignorados=%d erros=%d",
        PORTAL,
        novos,
        ignorados,
        erros,
    )
    return coletados


def main() -> None:
    """Coleta e persiste no banco com o gate FECHADO (pendente, não-pronto)."""
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    db.init_db()
    registros = coletar_laudos()
    inseridos = sum(1 for r in registros if db.inserir_laudo(r))
    log.info("RESUMO_PERSISTENCIA portal=%s inseridos=%d", PORTAL, inseridos)


if __name__ == "__main__":
    main()
