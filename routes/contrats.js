const express = require('express');
const db = require('../db');
const { auth } = require('./auth');

const router = express.Router();

// GET /api/contrats?search=&collaborateur=&jours=&point_vente=
router.get('/', auth, (req, res) => {
  const { search, collaborateur, jours, point_vente } = req.query;
  let where = [];
  let params = {};

  if (search) {
    where.push('(client_name LIKE @s OR policy_number LIKE @s OR offre LIKE @s)');
    params.s = `%${search}%`;
  }
  if (collaborateur) {
    where.push('UPPER(collaborateur_nom) = UPPER(@collab)');
    params.collab = collaborateur;
  }
  if (point_vente) {
    where.push('point_vente = @pv');
    params.pv = point_vente;
  }
  if (jours) {
    const j = parseInt(jours);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limite = new Date(today);
    limite.setDate(limite.getDate() + j);
    where.push('expiration_date >= @today AND expiration_date <= @limite');
    params.today = today.toISOString().slice(0, 10);
    params.limite = limite.toISOString().slice(0, 10);
  }

  const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const contrats = db.prepare(`
    SELECT * FROM contrats ${whereStr}
    ORDER BY expiration_date ASC
  `).all(params);

  res.json(contrats);
});

// GET /api/contrats/stats
router.get('/stats', auth, (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const j7 = new Date(today); j7.setDate(j7.getDate() + 7);
  const j7Str = j7.toISOString().slice(0, 10);
  const j30 = new Date(today); j30.setDate(j30.getDate() + 30);
  const j30Str = j30.toISOString().slice(0, 10);

  const total = db.prepare('SELECT COUNT(*) as n FROM contrats').get().n;
  const expiresJ7 = db.prepare(
    'SELECT COUNT(*) as n FROM contrats WHERE expiration_date >= ? AND expiration_date <= ?'
  ).get(todayStr, j7Str).n;
  const expiresJ30 = db.prepare(
    'SELECT COUNT(*) as n FROM contrats WHERE expiration_date >= ? AND expiration_date <= ?'
  ).get(todayStr, j30Str).n;
  const expires = db.prepare(
    'SELECT COUNT(*) as n FROM contrats WHERE expiration_date < ?'
  ).get(todayStr).n;
  const sansCollab = db.prepare(
    'SELECT COUNT(*) as n FROM contrats WHERE collaborateur_nom IS NULL'
  ).get().n;
  const dernierImport = db.prepare(
    'SELECT created_at, nb_ndc, nb_associes FROM imports ORDER BY created_at DESC LIMIT 1'
  ).get();

  res.json({ total, expiresJ7, expiresJ30, expires, sansCollab, dernierImport });
});

// GET /api/contrats/collaborateurs — liste des collaborateurs présents
router.get('/collaborateurs', auth, (req, res) => {
  const rows = db.prepare(
    "SELECT DISTINCT collaborateur_nom FROM contrats WHERE collaborateur_nom IS NOT NULL ORDER BY collaborateur_nom"
  ).all();
  res.json(rows.map(r => r.collaborateur_nom));
});

// GET /api/contrats/points-vente
router.get('/points-vente', auth, (req, res) => {
  const rows = db.prepare(
    "SELECT DISTINCT point_vente FROM contrats WHERE point_vente IS NOT NULL ORDER BY point_vente"
  ).all();
  res.json(rows.map(r => r.point_vente));
});

module.exports = router;
