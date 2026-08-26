import { Router } from 'express';
import { db, toApi } from '../db.js';
import { validateTool } from '../lib/validate.js';
import { asyncRoute, conflict, notFound } from '../lib/errors.js';

export const tools = Router();

/* ---- READ many ---------------------------------------------------------- */
tools.get('/', asyncRoute((req, res) => {
  const { q = '', category = '', status = '' } = req.query;
  const where = [];
  const params = {};

  if (q) { where.push('(name LIKE :q OR asset_tag LIKE :q OR notes LIKE :q)'); params.q = `%${q}%`; }
  if (category) { where.push('category = :category'); params.category = String(category).toLowerCase(); }
  if (status) { where.push('status = :status'); params.status = String(status).toLowerCase(); }

  const sql = `SELECT * FROM tools ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY asset_tag`;
  const rows = db.prepare(sql).all(params);
  res.json({ data: rows.map(toApi), meta: { count: rows.length } });
}));

/* ---- READ one ----------------------------------------------------------- */
tools.get('/:id', asyncRoute((req, res) => {
  const row = db.prepare('SELECT * FROM tools WHERE id = ?').get(Number(req.params.id));
  if (!row) throw notFound('Tool');
  res.json({ data: toApi(row) });
}));

/* ---- CREATE ------------------------------------------------------------- */
tools.post('/', asyncRoute((req, res) => {
  const clean = validateTool(req.body);
  try {
    const info = db.prepare(`
      INSERT INTO tools (asset_tag, name, category, shelf, deposit, status, notes)
      VALUES (@asset_tag, @name, @category, @shelf, @deposit, @status, @notes)
    `).run(clean);
    const row = db.prepare('SELECT * FROM tools WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ data: toApi(row) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw conflict(`Asset tag ${clean.asset_tag} is already on another tool.`);
    }
    throw err;
  }
}));

/* ---- UPDATE ------------------------------------------------------------- */
tools.patch('/:id', asyncRoute((req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tools WHERE id = ?').get(id);
  if (!existing) throw notFound('Tool');

  const clean = validateTool(req.body, { partial: true });
  const set = Object.keys(clean).map((k) => `${k} = @${k}`).join(', ');

  try {
    db.prepare(`UPDATE tools SET ${set}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...clean, id });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw conflict(`Asset tag ${clean.asset_tag} is already on another tool.`);
    }
    throw err;
  }

  res.json({ data: toApi(db.prepare('SELECT * FROM tools WHERE id = ?').get(id)) });
}));

/* ---- DELETE ------------------------------------------------------------- */
tools.delete('/:id', asyncRoute((req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM tools WHERE id = ?').get(id);
  if (!row) throw notFound('Tool');
  db.prepare('DELETE FROM tools WHERE id = ?').run(id);
  res.status(200).json({ data: toApi(row), meta: { deleted: true } });
}));
