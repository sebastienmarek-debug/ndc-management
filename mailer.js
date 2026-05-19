const https = require('https');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = 'sebastien.marek@assurexcel.fr';
const FROM_NAME = 'NDC — ASSUREXCEL';

const MANAGERS = [
  'delphine.vanheule@mma.fr',
  'sebastien.marek@mma.fr',
];

function joursRestants(expirationDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - now) / 86400000);
}

function urgenceLabel(jours) {
  if (jours < 0) return `EXPIRÉE (${Math.abs(jours)}j)`;
  if (jours === 0) return "EXPIRE AUJOURD'HUI";
  return `J-${jours}`;
}

function urgenceCouleur(jours) {
  if (jours <= 0) return '#dc2626';
  if (jours <= 3) return '#d97706';
  return '#2563eb';
}

function urgenceBg(jours) {
  if (jours <= 0) return '#fef2f2';
  if (jours <= 3) return '#fef9c3';
  return '#eff6ff';
}

async function sendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const toList = Array.isArray(to) ? to : [to];
    const body = JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: toList.map(email => ({ email })),
      subject,
      htmlContent: html,
    });

    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({ success: true });
        else reject(new Error(`Brevo ${res.statusCode}: ${data}`));
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function buildLigneCollab(c) {
  const jours = joursRestants(c.expiration_date);
  const couleur = urgenceCouleur(jours);
  const bg = urgenceBg(jours);
  return `<tr style="background:${bg}">
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0"><strong>${c.policy_number || '—'}</strong></td>
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${c.client_name}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${c.offre || '—'}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${c.point_vente || '—'}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${new Date(c.expiration_date).toLocaleDateString('fr-FR')}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:${couleur}">${urgenceLabel(jours)}</td>
  </tr>`;
}

function buildEmailCollab(collaborateur, contrats, appUrl) {
  const lignes = contrats.map(buildLigneCollab).join('');
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `<div style="font-family:Arial,sans-serif;max-width:750px;margin:0 auto">
    <div style="background:#1a56db;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
      <h2 style="margin:0;font-size:18px">Notes de Couverture — Alertes J-7</h2>
      <p style="margin:4px 0 0;opacity:.8;font-size:13px">${dateStr}</p>
    </div>
    <div style="background:white;padding:20px 24px;border:1px solid #e2e8f0">
      <p>Bonjour <strong>${collaborateur}</strong>,</p>
      <p>Vous avez <strong>${contrats.length} note${contrats.length > 1 ? 's' : ''} de couverture</strong> qui expire${contrats.length > 1 ? 'nt' : ''} dans les 7 prochains jours :</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">N° Police</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Client</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Offre</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Point de vente</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Expiration</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Délai</th>
        </tr></thead>
        <tbody>${lignes}</tbody>
      </table>
      <div style="margin-top:20px;padding:12px 16px;background:#eff6ff;border-radius:6px;font-size:13px;color:#1e40af">
        Consultez le tableau de bord sur <a href="${appUrl}" style="color:#1a56db">${appUrl}</a>
      </div>
    </div>
    <div style="padding:12px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;font-size:11px;color:#94a3b8;text-align:center">
      Alerte automatique — NDC SARL ASSUREXCEL
    </div>
  </div>`;
}

function buildEmailManagers(parCollab, appUrl) {
  const totalContrats = Object.values(parCollab).reduce((s, arr) => s + arr.length, 0);
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const sections = Object.entries(parCollab).map(([collab, contrats]) => {
    const lignes = contrats.map(c => {
      const jours = joursRestants(c.expiration_date);
      const couleur = urgenceCouleur(jours);
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:13px">${c.policy_number || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:13px">${c.client_name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:13px">${c.offre || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:13px">${new Date(c.expiration_date).toLocaleDateString('fr-FR')}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:${couleur}">${urgenceLabel(jours)}</td>
      </tr>`;
    }).join('');
    return `<div style="margin-bottom:20px">
      <h3 style="font-size:14px;color:#1e293b;margin:0 0 8px;padding:8px 12px;background:#f8fafc;border-left:3px solid #1a56db">${collab} — ${contrats.length} NDC</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f8fafc">
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b">N° Police</th>
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b">Client</th>
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b">Offre</th>
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b">Expiration</th>
          <th style="padding:6px 10px;text-align:left;font-size:11px;color:#64748b">Délai</th>
        </tr></thead>
        <tbody>${lignes}</tbody>
      </table>
    </div>`;
  }).join('');

  return `<div style="font-family:Arial,sans-serif;max-width:750px;margin:0 auto">
    <div style="background:#0f172a;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
      <h2 style="margin:0;font-size:18px">Récap Managers — NDC J-7</h2>
      <p style="margin:4px 0 0;opacity:.7;font-size:13px">${dateStr}</p>
    </div>
    <div style="background:white;padding:20px 24px;border:1px solid #e2e8f0">
      <p><strong>${totalContrats} note${totalContrats > 1 ? 's' : ''} de couverture</strong> expirant dans 7 jours, réparties sur <strong>${Object.keys(parCollab).length} collaborateur${Object.keys(parCollab).length > 1 ? 's' : ''}</strong> :</p>
      ${sections}
      <div style="margin-top:16px;padding:12px 16px;background:#eff6ff;border-radius:6px;font-size:13px">
        <a href="${appUrl}" style="color:#1a56db">${appUrl}</a>
      </div>
    </div>
    <div style="padding:12px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;font-size:11px;color:#94a3b8;text-align:center">
      Alerte automatique — NDC SARL ASSUREXCEL
    </div>
  </div>`;
}

// Tri alphabétique des mots du nom pour comparer "LAURA HUET" == "HUET LAURA"
function normaliserNom(s) {
  return s.toUpperCase().trim().split(/\s+/).sort().join(' ');
}

function trouverUser(users, nom) {
  const cible = normaliserNom(nom);
  return users.find(u => normaliserNom(u.nom) === cible) || null;
}

async function envoyerAlertes(db) {
  const appUrl = process.env.APP_URL || 'https://ndc-management.up.railway.app';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateLimite = new Date(today);
  dateLimite.setDate(dateLimite.getDate() + 7);

  const todayStr = today.toISOString().slice(0, 10);
  const limiteStr = dateLimite.toISOString().slice(0, 10);

  // Charger tous les users une seule fois
  const allUsers = db.prepare('SELECT * FROM users').all();

  const contrats = db.prepare(`
    SELECT * FROM contrats
    WHERE expiration_date IS NOT NULL
      AND expiration_date >= @today
      AND expiration_date <= @limite
    ORDER BY collaborateur_nom, expiration_date
  `).all({ today: todayStr, limite: limiteStr });

  if (contrats.length === 0) {
    console.log('Aucune NDC J-7 — pas d\'email envoyé');
    return { contrats: 0, emailsEnvoyes: 0 };
  }

  console.log(`📧 ${contrats.length} NDC J-7 trouvées — envoi alertes...`);

  // Grouper par collaborateur
  const parCollab = {};
  for (const c of contrats) {
    const collab = c.collaborateur_nom || 'Non assigné';
    if (!parCollab[collab]) parCollab[collab] = [];
    parCollab[collab].push(c);
  }

  let emailsEnvoyes = 0;

  for (const [collab, contratsCollab] of Object.entries(parCollab)) {
    if (collab === 'Non assigné') continue;

    // Recherche flexible : insensible à l'ordre prénom/nom
    const userRow = trouverUser(allUsers, collab);
    const emailCollab = userRow?.email;
    const managerNom = userRow?.manager_nom;

    // Email au collaborateur
    if (emailCollab) {
      try {
        await sendEmail({
          to: emailCollab,
          subject: `${contratsCollab.length} NDC expire${contratsCollab.length > 1 ? 'nt' : ''} dans 7 jours`,
          html: buildEmailCollab(collab, contratsCollab, appUrl),
        });
        console.log(`  ✅ Email → ${emailCollab} (${contratsCollab.length} NDC)`);
        emailsEnvoyes++;
      } catch (e) {
        console.error(`  ❌ Erreur email ${emailCollab}:`, e.message);
      }
    } else {
      console.log(`  ⚠️  Pas d'email pour "${collab}" — aucun user correspondant`);
    }

    // Email au manager du collaborateur (si différent des 2 managers fixes)
    if (managerNom) {
      const managerRow = trouverUser(allUsers, managerNom);
      const emailManager = managerRow?.email;
      if (emailManager && !MANAGERS.includes(emailManager)) {
        try {
          await sendEmail({
            to: emailManager,
            subject: `[NDC] ${collab} — ${contratsCollab.length} NDC J-7`,
            html: buildEmailCollab(collab, contratsCollab, appUrl),
          });
          console.log(`  ✅ Email manager → ${emailManager}`);
          emailsEnvoyes++;
        } catch (e) {
          console.error(`  ❌ Erreur email manager ${emailManager}:`, e.message);
        }
      }
    }
  }

  // Récap managers fixes
  const parCollabSansNonAssigne = Object.fromEntries(
    Object.entries(parCollab).filter(([k]) => k !== 'Non assigné')
  );
  if (Object.keys(parCollabSansNonAssigne).length > 0) {
    try {
      await sendEmail({
        to: MANAGERS,
        subject: `Récap NDC J-7 — ${contrats.length} NDC à traiter`,
        html: buildEmailManagers(parCollabSansNonAssigne, appUrl),
      });
      console.log(`  ✅ Récap managers envoyé`);
      emailsEnvoyes++;
    } catch (e) {
      console.error('  ❌ Erreur récap managers:', e.message);
    }
  }

  console.log(`📧 Terminé — ${emailsEnvoyes} email(s) envoyé(s)`);
  return { contrats: contrats.length, emailsEnvoyes };
}

module.exports = { envoyerAlertes, sendEmail };
