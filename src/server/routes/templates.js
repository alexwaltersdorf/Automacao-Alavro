import express from 'express';
import { asyncHandler } from '../middleware.js';
import { getClient } from '../../whatsapp/client.js';
import { getDb, nowIso } from '../../db/index.js';
import logger from '../../logger.js';

const log = logger.child({ module: 'templates' });
const router = express.Router();

/** Templates em cache local (rápido, não consome cota da Graph API). */
router.get('/', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM templates_cache ORDER BY name, language').all();
  res.json({
    items: rows.map((row) => ({ ...row, components: row.components ? JSON.parse(row.components) : null })),
  });
});

/** Busca os templates direto na Meta e atualiza o cache local. */
router.post(
  '/sync',
  asyncHandler(async (_req, res) => {
    const client = getClient();
    const db = getDb();
    const collected = [];

    let after;
    do {
      const page = await client.listTemplates({ limit: 100, after });
      collected.push(...(page.data ?? []));
      after = page.paging?.cursors?.after;
      if (!page.paging?.next) after = undefined;
    } while (after);

    const upsert = db.prepare(
      `INSERT INTO templates_cache (name, language, status, category, components, synced_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (name, language) DO UPDATE SET
         status = excluded.status, category = excluded.category,
         components = excluded.components, synced_at = excluded.synced_at`,
    );
    db.transaction(() => {
      for (const template of collected) {
        upsert.run(
          template.name,
          template.language,
          template.status,
          template.category,
          JSON.stringify(template.components ?? []),
          nowIso(),
        );
      }
    })();

    log.info('templates sincronizados', { total: collected.length });
    res.json({
      synced: collected.length,
      approved: collected.filter((t) => t.status === 'APPROVED').length,
      items: collected,
    });
  }),
);

/**
 * Cria um template na Meta. Ele entra em análise e só pode ser usado
 * depois de aprovado (status APPROVED).
 *
 * Exemplo de corpo:
 * {
 *   "name": "promocao_julho",
 *   "language": "pt_BR",
 *   "category": "MARKETING",
 *   "components": [
 *     { "type": "BODY", "text": "Olá {{1}}, temos uma novidade para você!",
 *       "example": { "body_text": [["Maria"]] } },
 *     { "type": "FOOTER", "text": "Responda SAIR para não receber mais mensagens." }
 *   ]
 * }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, language = 'pt_BR', category = 'MARKETING', components } = req.body ?? {};
    if (!name || !Array.isArray(components)) {
      return res.status(400).json({ error: 'name e components são obrigatórios' });
    }
    const result = await getClient().createTemplate({ name, language, category, components });
    res.status(201).json(result);
  }),
);

router.delete(
  '/:name',
  asyncHandler(async (req, res) => {
    const result = await getClient().deleteTemplate(req.params.name);
    getDb().prepare('DELETE FROM templates_cache WHERE name = ?').run(req.params.name);
    res.json(result);
  }),
);

export default router;
