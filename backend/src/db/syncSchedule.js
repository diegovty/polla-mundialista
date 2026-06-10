/**
 * One-time script: fetch official kickoff times from football-data.org
 * and update scheduled_at for all group stage matches in the DB.
 *
 * Usage: FOOTBALL_API_KEY=xxx DATABASE_URL=xxx node src/db/syncSchedule.js
 */
require('dotenv').config();
const axios = require('axios');
const { pool } = require('./pool');

const API_BASE = 'https://api.football-data.org/v4';

const NAME_MAP = {
  'Korea Republic':               'South Korea',
  'Bosnia and Herzegovina':       'Bosnia-Herzegovina',
  'Ivory Coast':                  "Côte d'Ivoire",
  'Cape Verde':                   'Cabo Verde',
  'Cape Verde Islands':           'Cabo Verde',
  'DR Congo':                     'Congo DR',
  'Democratic Republic of Congo': 'Congo DR',
  'Turkey':                       'Türkiye',
};

function norm(name) { return NAME_MAP[name] || name; }

async function main() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) { console.error('FOOTBALL_API_KEY not set'); process.exit(1); }

  console.log('Fetching WC group stage matches from football-data.org...');
  const { data } = await axios.get(
    `${API_BASE}/competitions/WC/matches?stage=GROUP_STAGE`,
    { headers: { 'X-Auth-Token': key }, timeout: 15000 }
  );

  const apiMatches = data.matches || [];
  console.log(`Got ${apiMatches.length} matches from API`);

  let updated = 0, skipped = 0;

  for (const m of apiMatches) {
    const homeTeam = norm(m.homeTeam.name);
    const awayTeam = norm(m.awayTeam.name);
    const utcDate  = m.utcDate; // ISO string, e.g. "2026-06-11T19:00:00Z"

    if (!utcDate) { skipped++; continue; }

    // Try normal order first, then swapped
    let res = await pool.query(
      'UPDATE matches SET scheduled_at=$1 WHERE team_a=$2 AND team_b=$3 AND stage=$4 RETURNING id',
      [utcDate, homeTeam, awayTeam, 'group']
    );
    if (!res.rowCount) {
      res = await pool.query(
        'UPDATE matches SET scheduled_at=$1 WHERE team_a=$2 AND team_b=$3 AND stage=$4 RETURNING id',
        [utcDate, awayTeam, homeTeam, 'group']
      );
    }

    if (res.rowCount) {
      console.log(`✓ ${homeTeam} vs ${awayTeam} → ${utcDate}`);
      updated++;
    } else {
      console.log(`✗ No DB match: ${homeTeam} vs ${awayTeam}`);
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
  await pool.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
