const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function openDatabase() {
  const candidates = [
    process.env.DB_PATH,
    path.join(__dirname, 'ndc.db'),
  ].filter(Boolean);

  for (const dbPath of candidates) {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const db = new Database(dbPath);
      console.log('✅ Base de données ouverte:', dbPath);
      return db;
    } catch (e) {
      console.warn('⚠️  Impossible d\'ouvrir la base à', dbPath, '—', e.message);
    }
  }
  throw new Error('Impossible d\'ouvrir la base de données.');
}

const db = openDatabase();

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'collaborateur',
    email TEXT,
    manager_nom TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nb_ndc INTEGER DEFAULT 0,
    nb_associes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contrats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_id INTEGER REFERENCES imports(id),
    policy_number TEXT,
    client_name TEXT,
    offre TEXT,
    policy_name TEXT,
    type_contrat TEXT,
    point_vente TEXT,
    effective_date TEXT,
    expiration_date TEXT,
    date_echeance TEXT,
    collaborateur_nom TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration : ajout colonne manager_nom si absente
try {
  db.exec(`ALTER TABLE users ADD COLUMN manager_nom TEXT`);
} catch (_) {}

module.exports = db;
