import { getDb, nowIso, todayUtc } from '../db/index.js';

/**
 * Limites da Meta que valem para QUALQUER envio — campanha ou mensagem avulsa.
 *
 * Ficam aqui, e não dentro do dispatcher, porque um envio avulso que ignorasse
 * o teto diário ou o intervalo por destinatário desregularia a contabilidade do
 * disparo em massa e ainda tomaria erro 131056 da Meta.
 */

/**
 * Quanto falta esperar antes de mandar outra mensagem para este número.
 * A Meta permite 1 mensagem a cada 6s para o mesmo usuário.
 * @returns {number} milissegundos (0 = pode enviar agora)
 */
export function pairRateWaitMs(phone, intervalMs, db = getDb()) {
  if (!intervalMs || intervalMs <= 0) return 0;

  const row = db.prepare('SELECT last_sent_at FROM recipient_throttle WHERE phone_e164 = ?').get(phone);
  if (!row) return 0;

  const elapsed = Date.now() - new Date(row.last_sent_at).getTime();
  if (Number.isNaN(elapsed) || elapsed < 0) return 0;
  return Math.max(0, intervalMs - elapsed);
}

export function recordRecipientSend(phone, db = getDb()) {
  db.prepare(
    `INSERT INTO recipient_throttle (phone_e164, last_sent_at) VALUES (?, ?)
     ON CONFLICT (phone_e164) DO UPDATE SET last_sent_at = excluded.last_sent_at`,
  ).run(phone, nowIso());
}

/**
 * Reserva uma vaga no teto diário de destinatários únicos do tier da Meta.
 * Número já contabilizado hoje não consome nova vaga.
 * @returns {boolean} false quando o teto do dia já foi atingido
 */
export function reserveDailySlot(phone, dailyLimit, db = getDb()) {
  if (!dailyLimit || dailyLimit <= 0) return true;
  const day = todayUtc();

  const already = db
    .prepare('SELECT 1 FROM daily_send_counter WHERE day = ? AND phone_e164 = ?')
    .get(day, phone);
  if (already) return true;

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM daily_send_counter WHERE day = ?').get(day);
  if (count >= dailyLimit) return false;

  db.prepare('INSERT INTO daily_send_counter (day, phone_e164) VALUES (?, ?) ON CONFLICT DO NOTHING').run(day, phone);
  return true;
}

export default { pairRateWaitMs, recordRecipientSend, reserveDailySlot };
