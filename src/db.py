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


# Colunas novas adicionadas de forma NÃO-DESTRUTIVA sobre o banco já em
# produção (Álvaro). ALTER TABLE ADD COLUMN é idempotente aqui porque
# verificamos PRAGMA table_info antes. NUNCA recriamos a tabela.
COLUNAS_NOVAS = {
    "plataforma": "TEXT",   # 'alvaro' | 'neomed' | 'eden' | ...
    "tipo_exame": "TEXT",   # 'Laboratorial' | 'MAPA' | 'Holter' | ...
}

# Defaults seguros para os registros legados do Álvaro (já em produção).
PLATAFORMA_LEGADO = "alvaro"
TIPO_EXAME_LEGADO = "Laboratorial"


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _colunas_existentes(conn: sqlite3.Connection) -> set[str]:
    return {r[1] for r in conn.execute("PRAGMA table_info(pacientes)").fetchall()}


def _migrar(conn: sqlite3.Connection) -> None:
    """Migração idempotente e não-destrutiva: adiciona colunas faltantes e
    faz backfill dos registros legados (sem telefone/dados existentes
    são preservados)."""
    cols = _colunas_existentes(conn)
    for nome, tipo in COLUNAS_NOVAS.items():
        if nome not in cols:
            conn.execute(f"ALTER TABLE pacientes ADD COLUMN {nome} {tipo}")
    # Registros antigos (sem plataforma/tipo) são do Álvaro -> Laboratorial.
    # Coletores sempre gravam valores não-vazios, então isto não toca os novos.
    conn.execute(
        "UPDATE pacientes SET plataforma=? WHERE plataforma IS NULL OR plataforma=''",
        (PLATAFORMA_LEGADO,),
    )
    conn.execute(
        "UPDATE pacientes SET tipo_exame=? WHERE tipo_exame IS NULL OR tipo_exame=''",
        (TIPO_EXAME_LEGADO,),
    )


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
                plataforma TEXT,
                tipo_exame TEXT,
                criado_em TEXT NOT NULL,
                atualizado_em TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_pacientes_fila "
            "ON pacientes (status_envio, pronto_para_envio)"
        )
        # Banco do Álvaro já existe em produção: garante as colunas novas.
        _migrar(conn)


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
    # Colunas NOT NULL no banco de produção do Álvaro (nome, cpf, numero_os,
    # data_exame): NUNCA inserir NULL. CPF é "opcional" para o Neomed, então
    # ausente vira string vazia '' — satisfaz o NOT NULL sem violar a constraint
    # (SQLite não permite alterar a constraint sem recriar a tabela).
    nome = (rec.get("nome") or "").strip()
    cpf = (rec.get("cpf") or "").strip()
    data_exame = (rec.get("data_exame") or "").strip()
    numero_os = (rec.get("numero_os") or "").strip()
    if not numero_os:
        raise ValueError("inserir_laudo: numero_os é obrigatório")
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO pacientes
                (nome, cpf, numero_os, data_exame, caminho_pdf,
                 plataforma, tipo_exame,
                 status_envio, pronto_para_envio, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', 0, ?, ?)
            """,
            (
                nome,
                cpf,
                numero_os,
                data_exame,
                rec.get("caminho_pdf") or "",
                rec.get("plataforma") or "",
                rec.get("tipo_exame") or "",
                agora,
                agora,
            ),
        )
        return cur.rowcount > 0


def listar_pendentes_envio() -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(SQL_FILA_ENVIO).fetchall()


def listar_plataformas() -> list[str]:
    """Plataformas distintas presentes no banco (para o filtro da webapp)."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT plataforma FROM pacientes "
            "WHERE plataforma IS NOT NULL AND plataforma!='' ORDER BY plataforma"
        ).fetchall()
    return [r[0] for r in rows]


def listar_tipos_exame() -> list[str]:
    """Tipos de exame distintos presentes no banco (para o filtro da webapp)."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT tipo_exame FROM pacientes "
            "WHERE tipo_exame IS NOT NULL AND tipo_exame!='' ORDER BY tipo_exame"
        ).fetchall()
    return [r[0] for r in rows]


def listar_pacientes_cadastro(
    data: str | None = None,
    nome: str | None = None,
    cpf: str | None = None,
    plataforma: str | None = None,
    tipo_exame: str | None = None,
) -> list[sqlite3.Row]:
    """Listagem unificada (todas as plataformas) para a webapp de cadastro/gate,
    com filtros opcionais por data, nome, CPF, plataforma e tipo de exame."""
    sql = (
        "SELECT id, nome, cpf, numero_os, data_exame, caminho_pdf, telefone, "
        "pronto_para_envio, status_envio, data_envio, plataforma, tipo_exame "
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
    if plataforma:
        sql += " AND plataforma=?"
        params.append(plataforma)
    if tipo_exame:
        sql += " AND tipo_exame=?"
        params.append(tipo_exame)
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
