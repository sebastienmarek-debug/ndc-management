const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// CORS — permettre les appels depuis le portail admin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});


app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

const { router: authRouter } = require('./routes/auth');
const contratsRouter = require('./routes/contrats');
const importsRouter = require('./routes/imports');
const usersRouter = require('./routes/users');

app.use('/api/auth', authRouter);
app.use('/api/contrats', contratsRouter);
app.use('/api/imports', importsRouter);
app.use('/api/users', usersRouter);

// Test email manuel (admin)
app.post('/api/test-email', require('./routes/auth').auth, async (req, res) => {
  try {
    const db = require('./db');
    const { envoyerAlertes } = require('./mailer');
    const result = await envoyerAlertes(db);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const { demarrerCron } = require('./cron');
demarrerCron();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 NDC Management en écoute sur le port ${PORT}`));
