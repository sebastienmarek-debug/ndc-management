const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('./auth');

const router = express.Router();

router.get('/', auth, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, nom, code, role, email, manager_nom, created_at FROM users ORDER BY nom').all();
  res.json(users);
});

router.post('/', auth, adminOnly, (req, res) => {
  const { nom, code, role, email, manager_nom } = req.body;
  if (!nom || !code) return res.status(400).json({ error: 'Nom et code requis' });
  try {
    const nomUpper = nom.trim().toUpperCase();
    const codeUpper = code.trim().toUpperCase();
    const emailVal = email ? email.trim().toLowerCase() : null;
    const managerVal = manager_nom ? manager_nom.trim().toUpperCase() : null;
    const r = db.prepare(
      'INSERT INTO users (nom, code, role, email, manager_nom) VALUES (?, ?, ?, ?, ?)'
    ).run(nomUpper, codeUpper, role || 'collaborateur', emailVal, managerVal);
    res.json({ id: r.lastInsertRowid, nom: nomUpper, code: codeUpper, role: role || 'collaborateur', email: emailVal, manager_nom: managerVal });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ce code existe déjà' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const { nom, code, role, email, manager_nom } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });
  try {
    db.prepare(
      'UPDATE users SET nom=?, code=?, role=?, email=?, manager_nom=? WHERE id=?'
    ).run(
      (nom || existing.nom).trim().toUpperCase(),
      (code || existing.code).trim().toUpperCase(),
      role || existing.role,
      email ? email.trim().toLowerCase() : existing.email,
      manager_nom ? manager_nom.trim().toUpperCase() : existing.manager_nom,
      req.params.id
    );
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ce code existe déjà' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
