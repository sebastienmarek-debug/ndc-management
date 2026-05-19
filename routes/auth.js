const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'ndc-secret-2024';

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
  next();
}

router.post('/login', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code requis' });
  const user = db.prepare('SELECT * FROM users WHERE UPPER(code) = UPPER(?)').get(code.trim());
  if (!user) return res.status(401).json({ error: 'Code incorrect' });
  const token = jwt.sign({ id: user.id, nom: user.nom, role: user.role }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, nom: user.nom, role: user.role } });
});

module.exports = { router, auth, adminOnly };
