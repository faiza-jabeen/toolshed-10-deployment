import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const file = process.env.DATABASE_PATH || './data/auth.db';
fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','keeper')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Refresh tokens are stored HASHED, never raw. A database leak therefore
  -- does not hand the attacker a set of working sessions.
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

  CREATE TABLE IF NOT EXISTS tools (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_tag  TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL,
    shelf      TEXT NOT NULL,
    deposit    INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'in' CHECK (status IN ('in','out','repair')),
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS loans (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool       TEXT NOT NULL,
    asset_tag  TEXT NOT NULL,
    due_on     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export const toolToApi = (r) => r && ({
  id: r.id, assetTag: r.asset_tag, name: r.name, category: r.category,
  shelf: r.shelf, deposit: r.deposit, status: r.status, notes: r.notes,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

/** Never let a password hash out of the data layer by accident. */
export const publicUser = (row) => row && ({
  id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at,
});
