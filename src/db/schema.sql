-- =============================================================================
-- Schema do sistema de disparo em massa via WhatsApp Cloud API
-- =============================================================================

PRAGMA foreign_keys = ON;

-- Contatos -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_e164        TEXT    NOT NULL UNIQUE,   -- 5511987654321 (sem "+")
  name              TEXT,
  attributes        TEXT    NOT NULL DEFAULT '{}', -- JSON com campos livres do CSV
  opted_in          INTEGER NOT NULL DEFAULT 1,    -- consentiu receber mensagens
  opted_out_at      TEXT,                          -- quando pediu descadastro
  opt_out_reason    TEXT,
  is_valid_whatsapp INTEGER,                       -- NULL = desconhecido, 0 = não tem WhatsApp
  last_inbound_at   TEXT,                          -- última mensagem recebida (janela de 24h)
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_opted_in ON contacts(opted_in);
CREATE INDEX IF NOT EXISTS idx_contacts_last_inbound ON contacts(last_inbound_at);

-- Formas alternativas do mesmo número (nono dígito no Brasil) para casar wa_id
CREATE TABLE IF NOT EXISTS contact_aliases (
  phone_variant TEXT    PRIMARY KEY,
  contact_id    INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE
);

-- Listas / segmentos ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lists (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS list_contacts (
  list_id    INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (list_id, contact_id)
);

-- Campanhas ------------------------------------------------------------------
-- status: draft | queued | running | paused | completed | failed | cancelled
CREATE TABLE IF NOT EXISTS campaigns (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT    NOT NULL,
  status              TEXT    NOT NULL DEFAULT 'draft',
  list_id             INTEGER REFERENCES lists(id) ON DELETE SET NULL,
  message_type        TEXT    NOT NULL DEFAULT 'template', -- template | text
  template_name       TEXT,
  template_language   TEXT    NOT NULL DEFAULT 'pt_BR',
  template_components TEXT,   -- JSON: mapeamento de variáveis {{1}}, {{2}}, header, botões
  body_text           TEXT,   -- usado quando message_type = 'text' (só dentro da janela de 24h)
  scheduled_at        TEXT,   -- ISO 8601; NULL = enviar imediatamente
  started_at          TEXT,
  finished_at         TEXT,
  last_error          TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Fila de mensagens ----------------------------------------------------------
-- status: pending | sending | sent | delivered | read | failed | skipped | cancelled
CREATE TABLE IF NOT EXISTS messages (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id    INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id     INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  phone_e164     TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'pending',
  wamid          TEXT,                       -- ID da mensagem retornado pela Meta
  attempts       INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,                      -- backoff: não tentar antes deste horário
  error_code     INTEGER,
  error_title    TEXT,
  error_detail   TEXT,
  payload        TEXT,                       -- JSON enviado à Graph API (auditoria)
  sent_at        TEXT,
  delivered_at   TEXT,
  read_at        TEXT,
  failed_at      TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  -- Idempotência: um contato só entra uma vez por campanha, mesmo se o
  -- processo for reiniciado no meio do disparo.
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_dispatch ON messages(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_wamid ON messages(wamid);

-- Mensagens recebidas --------------------------------------------------------
CREATE TABLE IF NOT EXISTS inbound_messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  wamid        TEXT    UNIQUE,
  contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  from_wa_id   TEXT    NOT NULL,
  profile_name TEXT,
  type         TEXT,
  body         TEXT,
  raw          TEXT,
  received_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inbound_contact ON inbound_messages(contact_id);

-- Log bruto dos webhooks (auditoria e reprocessamento) ------------------------
CREATE TABLE IF NOT EXISTS webhook_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  field       TEXT,
  payload     TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Controle do limite diário de destinatários únicos (tier da Meta) ------------
CREATE TABLE IF NOT EXISTS daily_send_counter (
  day        TEXT NOT NULL,   -- YYYY-MM-DD (UTC)
  phone_e164 TEXT NOT NULL,
  PRIMARY KEY (day, phone_e164)
);

-- Mensagens avulsas (fora de campanha) ---------------------------------------
-- Tabela separada de `messages` de propósito: ali vale UNIQUE (campanha,
-- contato) para garantir idempotência do disparo em massa, enquanto aqui
-- reenviar para o mesmo número é legítimo (confirmação, atendimento, teste).
-- status: sent | delivered | read | failed
CREATE TABLE IF NOT EXISTS direct_messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  phone_e164   TEXT    NOT NULL,
  type         TEXT    NOT NULL,   -- template | text
  status       TEXT    NOT NULL DEFAULT 'sent',
  wamid        TEXT,
  source       TEXT,               -- api | cli
  payload      TEXT,
  error_code   INTEGER,
  error_title  TEXT,
  error_detail TEXT,
  sent_at      TEXT,
  delivered_at TEXT,
  read_at      TEXT,
  failed_at    TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_wamid ON direct_messages(wamid);
CREATE INDEX IF NOT EXISTS idx_direct_messages_phone ON direct_messages(phone_e164);

-- Pair rate limit: último envio para cada destinatário -----------------------
-- A Meta permite 1 mensagem a cada 6 segundos para o MESMO usuário
-- (~10/min, 600/h). Ultrapassar dispara o erro 131056.
CREATE TABLE IF NOT EXISTS recipient_throttle (
  phone_e164   TEXT NOT NULL PRIMARY KEY,
  last_sent_at TEXT NOT NULL
);

-- Cache dos templates aprovados na Meta --------------------------------------
CREATE TABLE IF NOT EXISTS templates_cache (
  name        TEXT NOT NULL,
  language    TEXT NOT NULL,
  status      TEXT,
  category    TEXT,
  components  TEXT,
  synced_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (name, language)
);
