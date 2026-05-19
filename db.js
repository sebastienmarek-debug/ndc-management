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

// Seed : admin + tous les collaborateurs (mêmes codes que fichedebord)
const adminExists = db.prepare("SELECT id FROM users WHERE code = 'MANAGER@SSUREXCEL'").get();
if (!adminExists) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO users (nom, code, role, email, manager_nom) VALUES (?, ?, ?, ?, ?)'
  );
  const seed = db.transaction(() => {
    insert.run('Administrateur', 'MANAGER@SSUREXCEL', 'admin', 'sebastien.marek@mma.fr', null);
    insert.run('ANNIE MANSON',          'FLERS-AM',      'collaborateur', 'annie.manson@mma.fr',          null);
    insert.run('BELLOCHE FLORENCE',     'FLERS-BF',      'collaborateur', 'florence.belloche@mma.fr',     null);
    insert.run('BOUVIER JUSTINE',       'FLERS-BJ',      'collaborateur', 'justine.bouvier@mma.fr',       null);
    insert.run('CAILLE ETIENNE AURELIE','LAFM-ACE',      'collaborateur', null,                           null);
    insert.run('CELINE DAVID',          'CONDE-CD',      'collaborateur', 'celine.david1@mma.fr',         null);
    insert.run('CHAUBY ISABELLE',       'LAFM-IC',       'collaborateur', 'isabelle.chauby@mma.fr',       null);
    insert.run('DERENEMESNIL VANESSA',  'CAEN-DV',       'collaborateur', null,                           null);
    insert.run('DESBISSONS XAVIER',     'ENT-DX',        'collaborateur', 'xavier.desbissons@mma.fr',     null);
    insert.run('DIANA SANDRINE',        'CAEN-DS',       'collaborateur', 'sandrine.diana@mma.fr',        null);
    insert.run('DREUX THERESE',         'BRIOUZE-TD',    'collaborateur', 'therese.dreux@mma.fr',         null);
    insert.run('FERREIRA FATIMA',       'FLERS-FF',      'collaborateur', 'fatima.ferreira@mma.fr',       null);
    insert.run('FORTIN MARIE-LAURENCE', 'CONDE-FM',      'collaborateur', null,                           null);
    insert.run('HEUZE FABIEN',          'BRIOUZE-HF',    'collaborateur', null,                           null);
    insert.run('HUET LAURA',            'FLERS-HL',      'collaborateur', 'laura.huet@mma.fr',            null);
    insert.run('ILLAN LESAGE',          'PDV-IL',        'collaborateur', 'illan.lesage@mma.fr',          null);
    insert.run('LAIGRE LORANNE',        'ENT-LL',        'collaborateur', 'loranne.laigre@mma.fr',        null);
    insert.run('LECHAT FLORENCE',       'CAEN-LF',       'collaborateur', 'florence.lechat@mma.fr',       null);
    insert.run('LECOT ANGELIQUE',       'ENT-AL',        'collaborateur', 'angelique.lecot@mma.fr',       null);
    insert.run('LECOT ANTOINE',         'FLERS-LA',      'collaborateur', null,                           null);
    insert.run('LEONARD MEGHAN',        'CAEN-LM',       'collaborateur', 'meghan.leonard@mma.fr',        null);
    insert.run('LESAGE ILLAN',          'CONDE-IL',      'collaborateur', null,                           null);
    insert.run('MARY JULIE',            'LAFM-MJ',       'collaborateur', null,                           null);
    insert.run('MELLION VIRGINIE',      'ENT-MV',        'collaborateur', 'virginie.mellion@mma.fr',      null);
    insert.run('PERIER SEVERINE',       'CARROUGES-PS',  'collaborateur', 'severine.perier@mma.fr',       null);
    insert.run('PREVEL OLIVIER',        'CAEN-PO',       'collaborateur', 'olivier.prevel@mma.fr',        null);
    insert.run('ROMAGNE PASCAL',        'BRIOUZE-RP',    'collaborateur', null,                           null);
    insert.run('VANHEULE DELPHINE',     'LAFM-VD',       'collaborateur', 'delphine.vanheule@mma.fr',     null);
    insert.run('WAJDA AURELIE',         'CAEN-WA',       'collaborateur', 'aurelie.wajda@mma.fr',         null);
  });
  seed();
  console.log('✅ Utilisateurs seedés (codes identiques à fichedebord)');
}

module.exports = db;
