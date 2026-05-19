const db = require('./db');
const { envoyerAlertes } = require('./mailer');

function demarrerCron() {
  console.log('⏰ CRON démarré — alertes NDC J-7 tous les jours à 8h00 (Europe/Paris)');

  setInterval(async () => {
    const now = new Date();
    const heureParis = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

    if (heureParis === '08:00') {
      console.log(`⏰ ${now.toISOString()} — Déclenchement alertes NDC J-7`);
      try {
        await envoyerAlertes(db);
      } catch (e) {
        console.error('❌ Erreur CRON:', e.message);
      }
    }
  }, 60 * 1000);
}

module.exports = { demarrerCron };
