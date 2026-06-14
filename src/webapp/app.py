"""Webapp de cadastro/gate (FastAPI). Reaproveitável por todas as plataformas.

Operador faz login (usuário único + senha SHA-256), filtra por data/nome/CPF,
cadastra o telefone do paciente e marca pronto_para_envio=1 (gate humano).

IMPORTANTE (bug já corrigido no Álvaro): o SessionMiddleware deve ser o ÚLTIMO
add_middleware (fica mais externo). O middleware de _exigir_login fica interno
a ele, garantindo que request.session já exista quando ele roda.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

from src import config, db

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Rotas que dispensam login.
ROTAS_PUBLICAS = {"/login", "/healthz"}

app = FastAPI(title="Laudos WhatsApp — Cadastro")


class ExigirLogin(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ROTAS_PUBLICAS or request.url.path.startswith(
            "/static"
        ):
            return await call_next(request)
        if not request.session.get("usuario"):
            return RedirectResponse("/login", status_code=303)
        return await call_next(request)


# ORDEM CRÍTICA: ExigirLogin primeiro (interno), SessionMiddleware por ÚLTIMO
# (externo) — assim request.session existe antes do ExigirLogin rodar.
app.add_middleware(ExigirLogin)
app.add_middleware(SessionMiddleware, secret_key=config.SESSION_SECRET)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return templates.TemplateResponse(request, "login.html", {"erro": None})


@app.post("/login")
def login_submit(request: Request, usuario: str = Form(...), senha: str = Form(...)):
    if usuario == config.WEBAPP_USER and config.senha_confere(senha):
        request.session["usuario"] = usuario
        return RedirectResponse("/", status_code=303)
    return templates.TemplateResponse(
        request, "login.html", {"erro": "Usuário ou senha inválidos."},
        status_code=401,
    )


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)


@app.get("/", response_class=HTMLResponse)
def listar(
    request: Request,
    data: str | None = None,
    nome: str | None = None,
    cpf: str | None = None,
):
    pacientes = db.listar_pacientes_cadastro(data=data, nome=nome, cpf=cpf)
    return templates.TemplateResponse(
        request,
        "lista.html",
        {"pacientes": pacientes, "data": data or "", "nome": nome or "",
         "cpf": cpf or ""},
    )


@app.post("/paciente/{pid}/telefone")
def cadastrar(pid: int, telefone: str = Form(...), liberar: str | None = Form(None)):
    telefone = "".join(ch for ch in telefone if ch.isdigit())
    db.cadastrar_telefone(pid, telefone, liberar is not None)
    return RedirectResponse("/", status_code=303)
