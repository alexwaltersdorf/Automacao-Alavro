"""Acesso ao SQLite. Tabela principal: `pacientes` (NÃO `laudos`).

Reaproveitável por TODA plataforma — só o coletor muda. Nunca logar PII aqui.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from src import config

# Query da fila de envio — coração do gate humano. NÃO alterar a semântica:
# só sai laudo com telefone preenchido, PDF existente e liberação manual.
SQL_FILA_ENVIO = """
SELECT id, nome, cpf, numero_os, data_exame, caminho_pdf, telefone
FROM pacientes
WHERE status_envio='pendente'
  AND pronto_para_envio=1
  AND telefone IS NOT NULL AND telefone!=''
  AND caminho_pdf IS NOT NULL AND caminho_pdf!=''
ORDER BY data_exame ASC, numero_os ASC
"""


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_conn() -> sqlite3.Connection:
    Path(config.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pacientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                cpf TEXT,
                numero_os TEXT NOT NULL UNIQUE,
                data_exame TEXT,
                caminho_pdf TEXT,
                telefone TEXT,
                telefone_cadastrado INTEGER NOT NULL DEFAULT 0,
                telefone_cadastrado_em TEXT,
                pronto_para_envio INTEGER NOT NULL DEFAULT 0,
                pronto_para_envio_em TEXT,
                status_envio TEXT NOT NULL DEFAULT 'pendente',
                data_envio TEXT,
                portal TEXT,
                criado_em TEXT NOT NULL,
                atualizado_em TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_pacientes_fila "
            "ON pacientes (status_envio, pronto_para_envio)"
        )


def existe_os(numero_os: str) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM pacientes WHERE numero_os=? LIMIT 1", (numero_os,)
        ).fetchone()
    return row is not None


def inserir_laudo(rec: dict) -> bool:
    """Insere um laudo coletado (gate fechado: pendente + não-pronto).

    Idempotente por numero_os: ignora se já existe. Retorna True se inseriu.
    """
    agora = _agora()
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO pacientes
                (nome, cpf, numero_os, data_exame, caminho_pdf, portal,
                 status_envio, pronto_para_envio, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?, 'pendente', 0, ?, ?)
            """,
            (
                rec.get("nome", ""),
                rec.get("cpf") or "",
                rec["numero_os"],
                rec.get("data_exame") or "",
                rec.get("caminho_pdf") or "",
                rec.get("portal"),
                agora,
                agora,
            ),
        )
        return cur.rowcount > 0


def listar_pendentes_envio() -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(SQL_FILA_ENVIO).fetchall()


def listar_pacientes_cadastro(
    data: str | None = None, nome: str | None = None, cpf: str | None = None
) -> list[sqlite3.Row]:
    """Listagem para a webapp de cadastro, com filtros opcionais."""
    sql = (
        "SELECT id, nome, cpf, numero_os, data_exame, caminho_pdf, telefone, "
        "pronto_para_envio, status_envio, data_envio, portal "
        "FROM pacientes WHERE 1=1"
    )
    params: list[str] = []
    if data:
        sql += " AND substr(data_exame,1,10)=?"
        params.append(data)
    if nome:
        sql += " AND nome LIKE ?"
        params.append(f"%{nome}%")
    if cpf:
        sql += " AND cpf LIKE ?"
        params.append(f"%{cpf}%")
    sql += " ORDER BY data_exame DESC, numero_os DESC LIMIT 500"
    with get_conn() as conn:
        return conn.execute(sql, params).fetchall()


def get_paciente(pid: int) -> sqlite3.Row | None:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM pacientes WHERE id=?", (pid,)
        ).fetchone()


def cadastrar_telefone(pid: int, telefone: str, liberar: bool) -> None:
    """Cadastra telefone e (opcional) libera para envio — gate humano."""
    agora = _agora()
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE pacientes SET
                telefone=?,
                telefone_cadastrado=1,
                telefone_cadastrado_em=?,
                pronto_para_envio=?,
                pronto_para_envio_em=CASE WHEN ?=1 THEN ? ELSE pronto_para_envio_em END,
                atualizado_em=?
            WHERE id=?
            """,
            (telefone, agora, 1 if liberar else 0, 1 if liberar else 0, agora,
             agora, pid),
        )


def marcar_enviado(pid: int) -> None:
    agora = _agora()
    with get_conn() as conn:
        conn.execute(
            "UPDATE pacientes SET status_envio='enviado', data_envio=?, "
            "atualizado_em=? WHERE id=?",
            (agora, agora, pid),
        )
