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


def _cpf_norm(cpf: str | None) -> str:
    """Normaliza o CPF para só dígitos (chave estável da agenda de contatos)."""
    return "".join(ch for ch in (cpf or "") if ch.isdigit())


def _telefone_agenda(conn: sqlite3.Connection, cpf: str) -> str:
    """Telefone salvo na agenda para um CPF (ou '' se não houver). Usa a
    conexão recebida para participar da mesma transação do INSERT."""
    cpf_n = _cpf_norm(cpf)
    if not cpf_n:
        return ""
    row = conn.execute(
        "SELECT telefone FROM contatos_pacientes WHERE cpf=?", (cpf_n,)
    ).fetchone()
    return (row[0] if row and row[0] else "")


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
        # Agenda de contatos por CPF (telefone persistente, reutilizado em novas
        # OS). Tabela NOVA -> não-destrutiva, não toca em `pacientes`.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS contatos_pacientes (
                cpf TEXT PRIMARY KEY,
                telefone TEXT NOT NULL,
                atualizado_em TEXT NOT NULL
            )
            """
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
        # Auto-preenchimento: nova OS sem telefone herda o contato da agenda
        # pelo CPF. NUNCA marca pronto_para_envio (gate continua manual).
        telefone = (rec.get("telefone") or "").strip() or _telefone_agenda(conn, cpf)
        tel_cad = 1 if telefone else 0
        tel_cad_em = agora if telefone else None
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO pacientes
                (nome, cpf, numero_os, data_exame, caminho_pdf,
                 plataforma, tipo_exame, telefone, telefone_cadastrado,
                 telefone_cadastrado_em,
                 status_envio, pronto_para_envio, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 0, ?, ?)
            """,
            (
                nome,
                cpf,
                numero_os,
                data_exame,
                rec.get("caminho_pdf") or "",
                rec.get("plataforma") or "",
                rec.get("tipo_exame") or "",
                telefone,
                tel_cad,
                tel_cad_em,
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


# ---------------------------------------------------------------------------
# Agenda de contatos por CPF: telefone persistente reutilizado em novas OS.
# ---------------------------------------------------------------------------

def buscar_contato(cpf: str) -> str | None:
    """Telefone salvo na agenda para um CPF (ou None se não houver)."""
    cpf_n = _cpf_norm(cpf)
    if not cpf_n:
        return None
    with get_conn() as conn:
        row = conn.execute(
            "SELECT telefone FROM contatos_pacientes WHERE cpf=?", (cpf_n,)
        ).fetchone()
    return row[0] if row else None


def upsert_contato(cpf: str, telefone: str) -> None:
    """Grava/atualiza o telefone na agenda por CPF (último vence) e PROPAGA o
    número para as OS já existentes do mesmo CPF que estão sem telefone.

    Nunca altera pronto_para_envio (o gate de liberação continua manual) e só
    preenche linhas com telefone vazio — nunca sobrescreve telefone digitado.
    Ignora silenciosamente quando CPF ou telefone estão vazios.
    """
    cpf_n = _cpf_norm(cpf)
    telefone = (telefone or "").strip()
    if not cpf_n or not telefone:
        return
    agora = _agora()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO contatos_pacientes (cpf, telefone, atualizado_em) "
            "VALUES (?, ?, ?) ON CONFLICT(cpf) DO UPDATE SET "
            "telefone=excluded.telefone, atualizado_em=excluded.atualizado_em",
            (cpf_n, telefone, agora),
        )
        # Retro-preenche OS existentes do mesmo CPF que ainda não têm telefone.
        conn.execute(
            "UPDATE pacientes SET telefone=?, telefone_cadastrado=1, "
            "telefone_cadastrado_em=?, atualizado_em=? "
            "WHERE replace(replace(replace(cpf,'.',''),'-',''),' ','')=? "
            "AND (telefone IS NULL OR telefone='')",
            (telefone, agora, agora, cpf_n),
        )


def marcar_enviado(paciente_id: int, sucesso: bool = True) -> None:
    """Marca o resultado do envio de um laudo (por id).

    Aceita a assinatura ANTIGA do Álvaro: marcar_enviado(paciente_id, sucesso=True).
    Os callers novos chamam marcar_enviado(pid) -> sucesso=True por padrão.
    """
    agora = _agora()
    status = "enviado" if sucesso else "erro"
    with get_conn() as conn:
        conn.execute(
            "UPDATE pacientes SET status_envio=?, "
            "data_envio=CASE WHEN ?='enviado' THEN ? ELSE data_envio END, "
            "atualizado_em=? WHERE id=?",
            (status, status, agora, agora, paciente_id),
        )


# ===========================================================================
# Camada de COMPATIBILIDADE RETROATIVA com o código de produção do Álvaro.
# Os módulos do vault NÃO presentes neste repo (scraper_alvaro.py,
# scraper_api.py, status_laudos.py) importam a API antiga do db.py. Como esses
# arquivos são PRESERVADOS no deploy (não sobrescritos), o db.py novo precisa
# expor as mesmas funções/assinaturas para não quebrar com ImportError.
#   - upsert_paciente / buscar_paciente_por_os / salvar_telefone_por_os /
#     marcar_pronto_para_envio: aliases que operam por numero_os.
#   - _conectar / _agora_iso / _coluna_existe: helpers privados antigos.
# ATENÇÃO: estas implementações são best-effort a partir das assinaturas
# informadas; confirmar contra o db.py de produção antes do deploy.
# ===========================================================================

# Aliases de helpers privados usados pelo código antigo.
_conectar = get_conn
_agora_iso = _agora


def _coluna_existe(*args) -> bool:
    """Compat: aceita (coluna), (tabela, coluna) ou (conn, tabela, coluna)."""
    largs = list(args)
    if largs and isinstance(largs[0], sqlite3.Connection):
        largs = largs[1:]
    if len(largs) >= 2:
        tabela, coluna = largs[0], largs[1]
    elif len(largs) == 1:
        tabela, coluna = "pacientes", largs[0]
    else:
        raise TypeError("_coluna_existe requer (coluna) ou (tabela, coluna)")
    with get_conn() as conn:
        cols = {r[1] for r in conn.execute(f"PRAGMA table_info({tabela})")}
    return coluna in cols


def upsert_paciente(rec: dict | None = None, **kwargs) -> int:
    """Compat: insere OU atualiza um laudo por numero_os.

    Equivalente ao fluxo antigo do scraper do Álvaro. Defaults seguros:
    plataforma='alvaro' e tipo_exame='Laboratorial' quando não informados.
    NUNCA toca telefone/pronto_para_envio/status_envio (preserva o gate humano).
    Retorna o id do paciente.
    """
    dados = dict(rec or {})
    dados.update(kwargs)
    plataforma = (dados.get("plataforma") or "alvaro").strip()
    tipo_exame = (dados.get("tipo_exame") or "Laboratorial").strip()
    nome = (dados.get("nome") or "").strip()
    cpf = (dados.get("cpf") or "").strip()            # NOT NULL na produção
    numero_os = (dados.get("numero_os") or "").strip()
    data_exame = (dados.get("data_exame") or "").strip()
    caminho_pdf = (dados.get("caminho_pdf") or "").strip()
    if not numero_os:
        raise ValueError("upsert_paciente: numero_os é obrigatório")
    agora = _agora()
    with get_conn() as conn:
        existente = conn.execute(
            "SELECT id FROM pacientes WHERE numero_os=?", (numero_os,)
        ).fetchone()
        if existente:
            # Atualiza só dados de origem; mantém caminho_pdf antigo se novo vazio.
            conn.execute(
                "UPDATE pacientes SET nome=?, cpf=?, data_exame=?, "
                "caminho_pdf=COALESCE(NULLIF(?, ''), caminho_pdf), "
                "plataforma=?, tipo_exame=?, atualizado_em=? WHERE numero_os=?",
                (nome, cpf, data_exame, caminho_pdf, plataforma, tipo_exame,
                 agora, numero_os),
            )
            return existente[0]
        # Nova OS: herda telefone da agenda pelo CPF (sem liberar — gate manual).
        telefone = _telefone_agenda(conn, cpf)
        tel_cad = 1 if telefone else 0
        tel_cad_em = agora if telefone else None
        cur = conn.execute(
            "INSERT INTO pacientes (nome, cpf, numero_os, data_exame, caminho_pdf, "
            "plataforma, tipo_exame, telefone, telefone_cadastrado, "
            "telefone_cadastrado_em, status_envio, pronto_para_envio, "
            "criado_em, atualizado_em) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 0, ?, ?)",
            (nome, cpf, numero_os, data_exame, caminho_pdf, plataforma,
             tipo_exame, telefone, tel_cad, tel_cad_em, agora, agora),
        )
        return cur.lastrowid


def buscar_paciente_por_os(numero_os: str) -> sqlite3.Row | None:
    """Compat: retorna o paciente pelo numero_os (ou None)."""
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM pacientes WHERE numero_os=?", (numero_os,)
        ).fetchone()


def salvar_telefone_por_os(numero_os: str, telefone: str) -> None:
    """Compat: grava o telefone de um paciente pelo numero_os (sem liberar)."""
    agora = _agora()
    with get_conn() as conn:
        conn.execute(
            "UPDATE pacientes SET telefone=?, telefone_cadastrado=1, "
            "telefone_cadastrado_em=?, atualizado_em=? WHERE numero_os=?",
            (telefone, agora, agora, numero_os),
        )


def marcar_pronto_para_envio(numero_os: str, pronto: bool = True) -> None:
    """Compat: libera (ou desfaz) o envio de um laudo pelo numero_os — gate."""
    agora = _agora()
    flag = 1 if pronto else 0
    with get_conn() as conn:
        conn.execute(
            "UPDATE pacientes SET pronto_para_envio=?, "
            "pronto_para_envio_em=CASE WHEN ?=1 THEN ? ELSE pronto_para_envio_em END, "
            "atualizado_em=? WHERE numero_os=?",
            (flag, flag, agora, agora, numero_os),
        )
