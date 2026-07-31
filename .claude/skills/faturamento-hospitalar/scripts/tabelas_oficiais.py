#!/usr/bin/env python3
"""Verifica e baixa tabelas oficiais de faturamento hospitalar.

Fontes: SIGTAP (DATASUS), Padrão TISS/TUSS (ANS), Rol (ANS), CMED (ANVISA),
CBHPM (AMB) e portarias no DOU (in.gov.br). Sem dependências externas.

Uso:
  tabelas_oficiais.py status [--fonte sigtap|tiss|cmed|rol|cbhpm] [--salvar]
  tabelas_oficiais.py baixar {sigtap|cmed|rol|tuss} [--grande]
  tabelas_oficiais.py dou [--dias 30]

As mecânicas de acesso (User-Agent, HTTP puro no SIGTAP, raspagem em vez de
URL fixa) estão documentadas em ../references/fontes-oficiais.md — mantenha
script e referência em sincronia.
"""
import argparse
import datetime as dt
import gzip
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
DATA_DIR = os.path.join(REPO_ROOT, "data", "tabelas-oficiais")
ESTADO_PATH = os.path.join(REPO_ROOT, "data", "estado-tabelas.json")

SIGTAP_RSS = "http://sigtap.datasus.gov.br/tabela-unificada/competencias.rss"
SIGTAP_ESPELHO = "https://raw.githubusercontent.com/RenatoKR/SIGTAP/main/tabelas/"
TISS_HUB = ("https://www.gov.br/ans/pt-br/assuntos/prestadores/"
            "padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss")
TUSS_ZIP = ("https://www.ans.gov.br/arquivos/extras/tiss/"
            "Padrao_TISS_Representacao_de_Conceitos_em_Saude_{comp}.zip")
CMED_PAGE = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos"
ROL_PAGE = ("https://www.gov.br/ans/pt-br/acesso-a-informacao/"
            "participacao-da-sociedade/atualizacao-do-rol-de-procedimentos")
CBHPM_PAGE = "https://amb.org.br/cbhpm/"
DOU_BUSCA = "https://www.in.gov.br/consulta/-/buscar/dou"

MESES = {m: i + 1 for i, m in enumerate(
    ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho",
     "agosto", "setembro", "outubro", "novembro", "dezembro"])}
MESES["março"] = 3


def fetch(url, range_probe=False, timeout=60):
    """GET com User-Agent de navegador; gov.br devolve 403 para HEAD/curl puro."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "*/*", "Accept-Encoding": "gzip"})
    if range_probe:
        req.add_header("Range", "bytes=0-0")
    resp = urllib.request.urlopen(req, timeout=timeout)
    data = resp.read()
    if resp.headers.get("Content-Encoding") == "gzip" or data[:2] == b"\x1f\x8b":
        try:
            data = gzip.decompress(data)
        except OSError:
            pass
    return resp, data


def probe_size(url):
    """Existência + tamanho via GET Range: bytes=0-0 (gov.br não aceita HEAD)."""
    try:
        resp, _ = fetch(url, range_probe=True, timeout=30)
        cr = resp.headers.get("Content-Range", "")
        m = re.search(r"/(\d+)$", cr)
        return int(m.group(1)) if m else None
    except urllib.error.HTTPError:
        return None


# ---------------------------------------------------------------- fontes ----

def fonte_sigtap():
    _, data = fetch(SIGTAP_RSS, timeout=45)
    xml = data.decode("utf-8", "replace")
    item = re.search(r"<item>(.*?)</item>", xml, re.S)
    if not item:
        raise RuntimeError("RSS sem <item> — feed mudou de formato?")
    bloco = item.group(1)
    titulo = re.search(r"<title>\s*(.*?)\s*</title>", bloco, re.S)
    link = re.search(r"<link>\s*(.*?)\s*</link>", bloco, re.S)
    pub = re.search(r"<pubDate>\s*(.*?)\s*</pubDate>", bloco, re.S)
    arquivo = link.group(1).rsplit("/", 1)[-1] if link else "?"
    return {
        "vigente": titulo.group(1) if titulo else "?",
        "arquivo": arquivo,
        "publicacao": pub.group(1) if pub else "?",
        "download": SIGTAP_ESPELHO + arquivo + "  (espelho comunitário; oficial: FTP DATASUS)",
        "chave": arquivo,
    }


def fonte_tiss():
    _, data = fetch(TISS_HUB)
    html = data.decode("utf-8", "replace")
    versoes = []
    for mes, ano in set(re.findall(r"padrao-tiss-([a-zç]+)-(\d{4})", html)):
        if mes in MESES:
            versoes.append((int(ano), MESES[mes], mes))
    versoes.sort(reverse=True)
    if not versoes:
        raise RuntimeError("nenhuma página padrao-tiss-<mes>-<ano> no hub")
    ano, mesn, mes = versoes[0]
    pagina = f"{TISS_HUB}/padrao-tiss-{mes}-{ano}"
    # TUSS tem URL previsível por AAAAMM — sonda do mês atual para trás
    hoje = dt.date.today()
    tuss_comp, tuss_bytes = None, None
    for i in range(0, 12):
        m = hoje.month - i
        y = hoje.year
        while m <= 0:
            m += 12
            y -= 1
        comp = f"{y}{m:02d}"
        tam = probe_size(TUSS_ZIP.format(comp=comp))
        if tam:
            tuss_comp, tuss_bytes = comp, tam
            break
    return {
        "vigente": f"Padrão TISS {mes.capitalize()}/{ano}"
                   + (f" · TUSS {tuss_comp} ({tuss_bytes/1e6:.0f} MB)" if tuss_comp else ""),
        "pagina_versao": pagina,
        "download": TUSS_ZIP.format(comp=tuss_comp) if tuss_comp else pagina,
        "chave": f"{ano}-{mesn:02d}|tuss:{tuss_comp}",
    }


def _cmed_links(html):
    padrao = re.compile(
        r'href="([^"]*arquivos/(xls|pdf)_conformidade_(site|gov)_(\d{8})_\d+\.(?:xlsx|pdf)/@@download/file)"')
    achados = {}
    for url, ext, tipo, data_pub in padrao.findall(html):
        if not url.startswith("http"):
            url = "https://www.gov.br" + url
        achados[f"{ext}_{tipo}"] = (url, data_pub)
    return achados


def fonte_cmed():
    _, data = fetch(CMED_PAGE)
    links = _cmed_links(data.decode("utf-8", "replace"))
    if not links:
        raise RuntimeError("nenhum link de lista na página da CMED — layout mudou?")
    data_pub = sorted(v[1] for v in links.values())[-1]
    xlsx_pmc = links.get("xls_site", ("?", ""))[0]
    return {
        "vigente": f"Listas PF/PMC/PMVG publicadas em "
                   f"{data_pub[6:8]}/{data_pub[4:6]}/{data_pub[0:4]}",
        "download": xlsx_pmc,
        "links": {k: v[0] for k, v in links.items()},
        "chave": data_pub,
    }


def fonte_rol():
    _, data = fetch(ROL_PAGE)
    html = data.decode("utf-8", "replace")
    anexo1 = re.search(r'href="([^"]*Anexo_I_Rol_[^"]*?\.xlsx)"', html)
    anexo2 = re.search(r'href="([^"]*Anexo_II_DUT[^"]*?\.pdf)"', html)
    if not anexo1:
        raise RuntimeError("Anexo I não encontrado na página do Rol — layout mudou?")
    url1 = anexo1.group(1)
    if not url1.startswith("http"):
        url1 = "https://www.gov.br" + url1
    nome1 = url1.rsplit("/", 1)[-1]
    rns = re.findall(r"RN[_.]?(\d{3})\.(\d{4})", nome1)
    ultima_rn = f"RN {rns[-1][0]}/{rns[-1][1]}" if rns else "?"
    return {
        "vigente": f"Rol consolidado até {ultima_rn} (arquivo {nome1})",
        "download": url1,
        "anexo_ii": anexo2.group(1) if anexo2 else None,
        "chave": nome1,
    }


def fonte_cbhpm():
    _, data = fetch(CBHPM_PAGE, timeout=90)
    html = data.decode("utf-8", "replace")
    edicao = re.search(r"ltima edi[^ ]* da CBHPM [^0-9]*(\d{4})", html)
    rns = [int(n) for n, _ in re.findall(r"RESOLUCAO-NORMATIVA-CNHM-(\d+)_(\d{4})", html)]
    coms = [int(n) for n, _ in re.findall(r"COMUNICADO-OFICIAL-CNHM-(\d+)_(\d{4})", html)]
    pdfs = sorted(set(re.findall(r'href="(https?://amb\.org\.br[^"]*\.pdf)"', html)))
    return {
        "vigente": f"Edição {edicao.group(1) if edicao else '?'}"
                   f" · RN CNHM nº {max(rns) if rns else '?'}"
                   f" · Comunicado nº {max(coms) if coms else '?'}"
                   " (reajuste anual de portes/UCO sai em outubro)",
        "download": CBHPM_PAGE + "  (tabela completa é paga; PDFs de RNs/comunicados são públicos)",
        "chave": f"rn:{max(rns) if rns else 0}|com:{max(coms) if coms else 0}|pdfs:{len(pdfs)}",
    }


FONTES = {"sigtap": fonte_sigtap, "tiss": fonte_tiss, "cmed": fonte_cmed,
          "rol": fonte_rol, "cbhpm": fonte_cbhpm}


# ------------------------------------------------------------------- ações --

def cmd_status(args):
    estado_antigo = {}
    if os.path.exists(ESTADO_PATH):
        with open(ESTADO_PATH) as f:
            estado_antigo = json.load(f)
    novos = {}
    selecao = [args.fonte] if args.fonte else list(FONTES)
    houve_erro = False
    print(f"## Tabelas oficiais — situação em {dt.date.today():%d/%m/%Y}\n")
    for nome in selecao:
        try:
            info = FONTES[nome]()
        except Exception as e:  # portais do governo oscilam — reporte e siga
            houve_erro = True
            print(f"[{nome.upper()}] ERRO: {e}")
            print("  → verifique manualmente: ver references/fontes-oficiais.md\n")
            continue
        chave = info["chave"]
        anterior = estado_antigo.get(nome, {}).get("chave")
        if anterior is None:
            marca = "(primeira verificação)"
        elif anterior != chave:
            marca = "[NOVO] — havia: " + str(anterior)
        else:
            marca = "inalterado"
        print(f"[{nome.upper()}] {info['vigente']}")
        for extra in ("publicacao", "pagina_versao", "anexo_ii"):
            if info.get(extra):
                print(f"  {extra}: {info[extra]}")
        print(f"  download: {info['download']}")
        print(f"  situação: {marca}\n")
        novos[nome] = {"chave": chave, "vigente": info["vigente"],
                       "verificado_em": dt.date.today().isoformat()}
    if args.salvar and novos:
        os.makedirs(os.path.dirname(ESTADO_PATH), exist_ok=True)
        estado_antigo.update(novos)
        with open(ESTADO_PATH, "w") as f:
            json.dump(estado_antigo, f, ensure_ascii=False, indent=2)
        print(f"Snapshot salvo em {ESTADO_PATH}")
    return 1 if houve_erro else 0


def _salvar(url, destino, minimo=1000):
    os.makedirs(DATA_DIR, exist_ok=True)
    caminho = os.path.join(DATA_DIR, destino)
    _, data = fetch(url, timeout=600)
    if len(data) < minimo:
        raise RuntimeError(f"download suspeito ({len(data)} bytes) de {url}")
    with open(caminho, "wb") as f:
        f.write(data)
    sha = hashlib.sha256(data).hexdigest()[:16]
    print(f"OK {caminho}  ({len(data)/1e6:.1f} MB, sha256:{sha})")
    return caminho


def cmd_baixar(args):
    alvo = args.alvo
    if alvo == "sigtap":
        info = fonte_sigtap()
        print(f"SIGTAP {info['vigente']} — arquivo oficial anunciado no RSS: {info['arquivo']}")
        print("Baixando do espelho comunitário (valide o nome contra o RSS acima):")
        _salvar(SIGTAP_ESPELHO + info["arquivo"], info["arquivo"])
    elif alvo == "cmed":
        info = fonte_cmed()
        print(info["vigente"])
        for tipo in ("xls_site", "xls_gov"):
            if tipo in info["links"]:
                nome = f"cmed_{tipo}_{info['chave']}.xlsx"
                _salvar(info["links"][tipo], nome)
    elif alvo == "rol":
        info = fonte_rol()
        print(info["vigente"])
        _salvar(info["download"], info["chave"])
    elif alvo == "tuss":
        info = fonte_tiss()
        url = info["download"]
        tam = probe_size(url)
        print(f"{info['vigente']}\nArquivo: {url}  (~{(tam or 0)/1e6:.0f} MB)")
        if not args.grande:
            print("ZIP TUSS é grande (~400 MB). Refaça com --grande para baixar, "
                  "ou use a consulta OCL da ANS para códigos pontuais.")
            return 0
        _salvar(url, url.rsplit("/", 1)[-1])
    return 0


def cmd_dou(args):
    desde = dt.date.today() - dt.timedelta(days=args.dias)
    query = urllib.parse.urlencode({
        "q": '"tabela de procedimentos"', "s": "do1",
        "orgPrin": "Ministério da Saúde",
        "publishFrom": desde.strftime("%d-%m-%Y"),
        "publishTo": dt.date.today().strftime("%d-%m-%Y"),
        "sortType": "0", "delta": "20"})
    _, data = fetch(f"{DOU_BUSCA}?{query}")
    html = data.decode("utf-8", "replace")
    pos = html.find("jsonArray")
    ini = html.find("[", pos) if pos != -1 else -1
    if ini == -1:
        raise RuntimeError("jsonArray não encontrado — in.gov.br mudou o formato "
                           "(tente curl --http1.1 com UA de navegador)")
    atos, _ = json.JSONDecoder().raw_decode(html[ini:])
    print(f"Portarias MS sobre tabela de procedimentos no DOU "
          f"(últimos {args.dias} dias): {len(atos)} resultado(s)\n")
    for ato in atos[:20]:
        titulo = ato.get("title") or ato.get("titulo") or "?"
        url_title = ato.get("urlTitle") or ""
        data_pub = ato.get("pubDate") or ato.get("publishDate") or "?"
        print(f"- {titulo}  ({data_pub})")
        if url_title:
            print(f"  https://www.in.gov.br/web/dou/-/{url_title}")
    return 0


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("status", help="versão vigente de cada fonte")
    s.add_argument("--fonte", choices=sorted(FONTES))
    s.add_argument("--salvar", action="store_true",
                   help="grava snapshot em data/estado-tabelas.json")
    b = sub.add_parser("baixar", help="baixa a tabela para data/tabelas-oficiais/")
    b.add_argument("alvo", choices=["sigtap", "cmed", "rol", "tuss"])
    b.add_argument("--grande", action="store_true",
                   help="confirma download de arquivos grandes (TUSS ~400 MB)")
    d = sub.add_parser("dou", help="portarias recentes de tabela SUS no DOU")
    d.add_argument("--dias", type=int, default=30)
    args = p.parse_args()
    try:
        return {"status": cmd_status, "baixar": cmd_baixar, "dou": cmd_dou}[args.cmd](args)
    except Exception as e:
        print(f"ERRO: {e}", file=sys.stderr)
        print("Consulte references/fontes-oficiais.md para verificação manual.",
              file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
