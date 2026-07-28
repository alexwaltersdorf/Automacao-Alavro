#!/usr/bin/env python3
"""Converte os documentos em Markdown para PDF em formato de documento oficial.

Uso: python3 build_pdf.py
Requer: markdown, chromium
"""
import re
import subprocess
import sys
from pathlib import Path

import markdown

BASE = Path(__file__).resolve().parent
OUT = BASE / "pdf"

CHROME = next(
    (p for p in ("/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                 "/usr/bin/chromium", "/usr/bin/chromium-browser",
                 "/usr/bin/google-chrome") if Path(p).exists()),
    "chromium",
)

CSS = """
@page { size: A4; margin: 22mm 20mm 20mm 22mm; }
* { box-sizing: border-box; }
body {
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 10.5pt; line-height: 1.5; color: #14161a; margin: 0;
  text-align: justify; hyphens: auto;
}
h1 {
  font-size: 14pt; text-align: center; text-transform: uppercase;
  letter-spacing: .04em; margin: 0 0 4mm; line-height: 1.3;
}
h2 {
  font-size: 11.5pt; text-transform: uppercase; letter-spacing: .03em;
  margin: 8mm 0 3mm; padding-bottom: 1.5mm;
  border-bottom: .6pt solid #14161a; text-align: left; page-break-after: avoid;
}
h3 {
  font-size: 10.5pt; margin: 6mm 0 2mm; text-align: left;
  page-break-after: avoid; color: #1f2937;
}
p { margin: 0 0 3mm; orphans: 3; widows: 3; }
strong { font-weight: 700; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1.4mm; }
blockquote {
  margin: 3mm 0 3mm 4mm; padding: 2mm 0 2mm 4mm;
  border-left: 2pt solid #9ca3af; font-style: italic; color: #374151;
}
blockquote p { margin: 0; }
table {
  width: 100%; border-collapse: collapse; margin: 3mm 0 4mm;
  font-size: 9pt; page-break-inside: avoid;
}
th, td {
  border: .5pt solid #6b7280; padding: 1.6mm 2mm;
  text-align: left; vertical-align: top;
}
th { background: #eef1f5; font-weight: 700; }
hr { border: none; border-top: .6pt solid #9ca3af; margin: 6mm 0; }
code { font-family: inherit; }

/* Cabecalho institucional */
.letterhead {
  text-align: center; border-bottom: 1.6pt solid #14161a;
  padding-bottom: 3mm; margin-bottom: 6mm;
}
.letterhead .name {
  font-size: 12.5pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; display: block;
}
.letterhead .meta {
  font-size: 8.5pt; color: #4b5563; display: block; margin-top: 1.5mm;
  line-height: 1.4;
}

/* Campos a preencher */
.fill {
  background: #fff3c4; border-bottom: .8pt dashed #a16207;
  padding: 0 1mm; color: #78350f;
}

/* Bloco de assinaturas */
.sig { margin-top: 9mm; page-break-inside: avoid; text-align: center; }
.sig .line {
  border-top: .7pt solid #14161a; width: 78mm; margin: 0 auto 1.5mm;
}
.sig .who { font-weight: 700; font-size: 10pt; }
.sig .reg { font-size: 9pt; color: #374151; }

.footer-note {
  margin-top: 6mm; padding-top: 2.5mm; border-top: .5pt solid #9ca3af; page-break-inside: avoid;
  font-size: 8pt; color: #4b5563; text-align: center; font-style: italic;
}
.pagebreak { page-break-before: always; }
"""

LETTERHEAD = """
<div class="letterhead">
  <span class="name">Clínica Total Quality</span>
  <span class="meta">
    Diagnóstico por Imagem e Análises Clínicas Ltda. &nbsp;&middot;&nbsp;
    CNPJ 47.513.472/0001-01<br>
    Av. Anchieta, 1010 &mdash; Centro &mdash; Caraguatatuba/SP &mdash; CEP 11660-010
  </span>
</div>
"""

# Marcadores que encerram a parte impressa do documento
CUT_MARKERS = (
    "## NOTA AO RESPONSÁVEL LEGAL",
    "## NOTA DE PREENCHIMENTO",
)


BLANK = "␟"  # sentinela para proteger placeholders com underscore


def prepare(md_text: str) -> str:
    """Remove notas internas, blocos de orientação e normaliza marcadores."""
    for marker in CUT_MARKERS:
        idx = md_text.find(marker)
        if idx != -1:
            md_text = md_text[:idx]
    # remove o blockquote de instrução do topo
    md_text = re.sub(r"^> \*\*(Documento|Dois documentos).*?\n\n", "", md_text,
                     flags=re.S | re.M)
    # remove identificação redundante com o cabeçalho institucional
    md_text = re.sub(r"^\*\*CLÍNICA TOTAL QUALITY — DIAGNÓSTICO.*\n", "", md_text, flags=re.M)
    md_text = re.sub(r"^CNPJ nº 47\.513\.472.*\n", "", md_text, flags=re.M)
    md_text = re.sub(r"^Av\. Anchieta, 1010.*\n", "", md_text, flags=re.M)
    # título não repete o nome da clínica
    md_text = md_text.replace("# OFÍCIO DE MANIFESTAÇÃO TÉCNICA — CLÍNICA TOTAL QUALITY",
                              "# Ofício de Manifestação Técnica")
    # arquivos que agregam dois documentos: descarta a capa e numera cada peça
    idx = md_text.find("# DOCUMENTO 1")
    if idx != -1:
        md_text = md_text[idx:]
    md_text = re.sub(r"^# DOCUMENTO \d+ — ", "# ", md_text, flags=re.M)
    # protege placeholders [___] contra a ênfase por underscore do markdown
    md_text = re.sub(r"\[_{2,}\]", lambda m: f"[{BLANK * (len(m.group(0)) - 2)}]", md_text)
    # linhas de assinatura
    md_text = md_text.replace("_______________________________________", BLANK * 39)
    # separadores triplos viram quebra de página
    md_text = md_text.replace("---\n---\n", "\n<div class='pagebreak'></div>\n\n")
    return md_text.strip().rstrip("-").strip()


def render(md_text: str) -> str:
    html = markdown.markdown(
        md_text, extensions=["tables", "sane_lists", "attr_list", "nl2br"]
    )
    # destaca campos a preencher
    html = re.sub(
        r"\[\*\*(PREENCHER|Se aplicável|Ajustar|transcrever|acrescentar)(.{0,1600}?)\]",
        lambda m: f'<span class="fill">[{m.group(1)}{m.group(2)}]</span>',
        html, flags=re.S | re.I,
    )
    # bloco de assinatura: linha longa de sentinelas -> régua estilizada
    html = re.sub(
        rf"<p>{BLANK}{{20,}}<br\s*/?>\s*(.*?)</p>",
        lambda m: ('<div class="sig"><div class="line"></div>'
                   f'<p class="who">{m.group(1)}</p></div>'),
        html, flags=re.S,
    )
    # placeholders curtos restantes -> campo destacado
    html = re.sub(rf"\[{BLANK}+\]",
                  lambda m: f'<span class="fill">{"&nbsp;" * (len(m.group(0)) - 2)}</span>',
                  html)
    html = html.replace(BLANK, "&nbsp;")
    # separadores consecutivos e <br> órfãos antes de blocos
    html = re.sub(r"(<hr\s*/?>\s*){2,}", "<hr/>", html)
    html = re.sub(r"<p><br\s*/?>\s*</p>", "", html)
    return html


def build(src: Path, title: str) -> Path:
    md_text = prepare(src.read_text(encoding="utf-8"))
    body = render(md_text)
    html = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{title}</title><style>{CSS}</style></head>
<body>{LETTERHEAD}{body}</body></html>"""
    OUT.mkdir(exist_ok=True)
    html_path = OUT / (src.stem + ".html")
    pdf_path = OUT / (src.stem + ".pdf")
    html_path.write_text(html, encoding="utf-8")
    subprocess.run(
        [
            CHROME, "--headless", "--disable-gpu", "--no-sandbox",
            "--no-pdf-header-footer", f"--print-to-pdf={pdf_path}",
            html_path.as_uri(),
        ],
        check=True, capture_output=True,
    )
    return pdf_path


DOCS = [
    ("2026-07-28-oficio-total-quality-manifestacao-tecnica-camara.md",
     "Ofício de Manifestação Técnica"),
    ("2026-07-28-parecer-colegiado-complementar-e-ata.md",
     "Parecer Conclusivo Colegiado e Ata de Deliberação"),
]

if __name__ == "__main__":
    for filename, title in DOCS:
        src = BASE / filename
        if not src.exists():
            sys.exit(f"nao encontrado: {src}")
        print("gerado:", build(src, title))
