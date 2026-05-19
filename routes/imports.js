const express = require('express');
const multer = require('multer');
const db = require('../db');
const { auth, adminOnly } = require('./auth');
const { mergeFiles } = require('../parser');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/imports — upload NDC.xlsx + collab.xlsx
router.post('/', auth, adminOnly, upload.fields([
  { name: 'ndc', maxCount: 1 },
  { name: 'collab', maxCount: 1 },
]), (req, res) => {
  const ndcFile = req.files?.ndc?.[0];
  const collabFile = req.files?.collab?.[0];

  if (!ndcFile || !collabFile) {
    return res.status(400).json({ error: 'Les deux fichiers sont requis (ndc + collab)' });
  }

  try {
    const { contrats, nbAssocies } = mergeFiles(ndcFile.buffer, collabFile.buffer);

    if (contrats.length === 0) {
      return res.status(400).json({ error: 'Aucune NDC valide trouvée dans le fichier NDC' });
    }

    const doImport = db.transaction(() => {
      // Supprimer les anciens contrats
      db.prepare('DELETE FROM contrats').run();

      const importRow = db.prepare(
        'INSERT INTO imports (nb_ndc, nb_associes) VALUES (?, ?)'
      ).run(contrats.length, nbAssocies);

      const insertContrat = db.prepare(`
        INSERT INTO contrats (import_id, policy_number, client_name, offre, policy_name, type_contrat, point_vente, effective_date, expiration_date, date_echeance, collaborateur_nom)
        VALUES (@import_id, @policy_number, @client_name, @offre, @policy_name, @type_contrat, @point_vente, @effective_date, @expiration_date, @date_echeance, @collaborateur_nom)
      `);

      for (const c of contrats) {
        insertContrat.run({ import_id: importRow.lastInsertRowid, ...c });
      }

      return importRow.lastInsertRowid;
    });

    const importId = doImport();

    res.json({
      ok: true,
      import_id: importId,
      nb_ndc: contrats.length,
      nb_associes: nbAssocies,
      nb_sans_collab: contrats.length - nbAssocies,
    });
  } catch (e) {
    console.error('Erreur import:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/imports — historique des imports
router.get('/', auth, (req, res) => {
  const imports = db.prepare('SELECT * FROM imports ORDER BY created_at DESC LIMIT 20').all();
  res.json(imports);
});

module.exports = router;
