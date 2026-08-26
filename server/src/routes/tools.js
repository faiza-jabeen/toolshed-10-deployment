import { Router } from 'express';
import { db, toolToApi } from '../db.js';
import { validateTool } from '../lib/toolValidate.js';
import { asyncRoute, conflict, notFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../lib/requireAuth.js';

export const tools = Router();

/** Reading the catalogue is public; changing it needs a keeper. */
tools.get('/', asyncRoute((req, res) => {
  const { q = '', category = '' } = req.query;
  const where = []; const params = {};
  if (q) { where.push('(name LIKE :q OR asset_tag LIKE :q OR notes LIKE :q)'); params.q = `%${q}%`; }
  if (category) { where.push('category = :category'); params.category = String(category).toLowerCase(); }
  const rows = db.prepare(
    `SELECT * FROM tools ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY asset_tag`,
  ).all(params);
  res.json({ data: rows.map(toolToApi), meta: { count: rows.length } });
}));

tools.post('/', requireAuth, requireRole('keeper'), asyncRoute((req, res) => {
  const clean = validateTool(req.body);
  try {
    const info = db.prepare(`INSERT INTO tools (asset_tag, name, category, shelf, deposit, status, notes)
      VALUES (@asset_tag, @name, @category, @shelf, @deposit, @status, @notes)`).run(clean);
    res.status(201).json({ data: toolToApi(db.prepare('SELECT * FROM tools WHERE id = ?').get(info.lastInsertRowid)) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw conflict(`Asset tag ${clean.asset_tag} is already in use.`);
    throw err;
  }
}));

tools.patch('/:id', requireAuth, requireRole('keeper'), asyncRoute((req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM tools WHERE id = ?').get(id)) throw notFound('Tool');
  const clean = validateTool(req.body, { partial: true });
  const set = Object.keys(clean).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE tools SET ${set}, updated_at = datetime('now') WHERE id = @id`).run({ ...clean, id });
  res.json({ data: toolToApi(db.prepare('SELECT * FROM tools WHERE id = ?').get(id)) });
}));

tools.delete('/:id', requireAuth, requireRole('keeper'), asyncRoute((req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM tools WHERE id = ?').get(id);
  if (!row) throw notFound('Tool');
  db.prepare('DELETE FROM tools WHERE id = ?').run(id);
  res.json({ data: toolToApi(row) });
}));
