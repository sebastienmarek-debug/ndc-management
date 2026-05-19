const XLSX = require('xlsx');

function normalizeNom(s) {
  if (!s) return '';
  return String(s).trim().toUpperCase().replace(/\s+/g, ' ');
}

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (!date) return null;
    return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  const s = String(val).trim();
  // ISO format with T: 2026-05-15T22:00:00.000Z
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // DD/MM/YYYY
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  return null;
}

function parseNDC(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  return rows.map(r => ({
    client_name: normalizeNom(r['Contrat_Account.Name']),
    offre: r['Offre'] ? String(r['Offre']).trim() : null,
    policy_number: r['Policy Number'] ? String(r['Policy Number']).trim() : null,
    effective_date: parseDate(r['Effective Date']),
    expiration_date: parseDate(r['Expiration Date']),
    date_echeance: r["Date d'échéance"] ? String(r["Date d'échéance"]).trim() : null,
    policy_name: r['Policy Name'] ? String(r['Policy Name']).trim() : null,
    type_contrat: r['ResumeContratType.Name'] ? String(r['ResumeContratType.Name']).trim() : null,
    point_vente: r['Contrat_Account.PointVente.Name'] ? String(r['Contrat_Account.PointVente.Name']).trim() : null,
  })).filter(r => r.client_name && r.expiration_date);
}

function parseCollab(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  // Map client_name → collaborateur
  const map = new Map();
  for (const r of rows) {
    const client = normalizeNom(r['Nom de la personne']);
    const collab = r['Propriétaire'] ? String(r['Propriétaire']).trim().toUpperCase() : null;
    if (client && collab && !map.has(client)) {
      map.set(client, collab);
    }
  }
  return map;
}

function mergeFiles(ndcBuffer, collabBuffer) {
  const ndcRows = parseNDC(ndcBuffer);
  const collabMap = parseCollab(collabBuffer);

  let nbAssocies = 0;
  const contrats = ndcRows.map(row => {
    const collab = collabMap.get(row.client_name) || null;
    if (collab) nbAssocies++;
    return { ...row, collaborateur_nom: collab };
  });

  return { contrats, nbAssocies };
}

module.exports = { mergeFiles };
