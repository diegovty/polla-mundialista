/**
 * Seed knockout stage matches from football-data.org into the DB.
 * Safe to re-run: uses INSERT ... ON CONFLICT DO UPDATE.
 *
 * Usage: DATABASE_URL=xxx FOOTBALL_API_KEY=xxx node src/db/seedKnockout.js
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

const FLAGS = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czechia': '🇨🇿',
  'Canada': '🇨🇦', 'Switzerland': '🇨🇭', 'Qatar': '🇶🇦', 'Bosnia-Herzegovina': '🇧🇦',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'United States': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Türkiye': '🇹🇷',
  'Germany': '🇩🇪', "Côte d'Ivoire": '🇨🇮', 'Curaçao': '🇨🇼', 'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Tunisia': '🇹🇳', 'Sweden': '🇸🇪',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Uruguay': '🇺🇾', 'Saudi Arabia': '🇸🇦', 'Cabo Verde': '🇨🇻',
  'France': '🇫🇷', 'Senegal': '🇸🇳', 'Norway': '🇳🇴', 'Iraq': '🇮🇶',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'Colombia': '🇨🇴', 'Uzbekistan': '🇺🇿', 'Congo DR': '🇨🇩',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦',
};

const STAGE_MAP = {
  LAST_32:      'last32',
  LAST_16:      'last16',
  QUARTER_FINALS: 'quarter',
  SEMI_FINALS:  'semi',
  THIRD_PLACE:  'third',
  FINAL:        'final',
};

function norm(name) {
  if (!name) return null;
  return NAME_MAP[name] || name;
}

async function main() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) { console.error('FOOTBALL_API_KEY not set'); process.exit(1); }

  console.log('Fetching all WC knockout matches from football-data.org...');
  const { data } = await axios.get(
    `${API_BASE}/competitions/WC/matches`,
    { headers: { 'X-Auth-Token': key }, timeout: 15000 }
  );

  const knockout = (data.matches || []).filter(m => m.stage !== 'GROUP_STAGE');
  console.log(`Found ${knockout.length} knockout matches`);

  let inserted = 0, updated = 0;
  let matchNum = 200; // start match_number above group stage

  for (const m of knockout) {
    const stage    = STAGE_MAP[m.stage] || m.stage.toLowerCase();
    const teamA    = norm(m.homeTeam?.name);
    const teamB    = norm(m.awayTeam?.name);
    const flagA    = teamA ? (FLAGS[teamA] || '🏳️') : '❓';
    const flagB    = teamB ? (FLAGS[teamB] || '🏳️') : '❓';
    const utcDate  = m.utcDate;

    const { rows } = await pool.query(
      `INSERT INTO matches (stage, group_name, matchday, match_number, team_a, team_b, flag_a, flag_b, scheduled_at, status)
       VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, $7, 'upcoming')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [stage, matchNum++, teamA || 'Por definir', teamB || 'Por definir', flagA, flagB, utcDate]
    );

    if (rows.length) {
      console.log(`✓ INSERT: [${stage}] ${teamA || 'TBD'} vs ${teamB || 'TBD'} → ${utcDate}`);
      inserted++;
    } else {
      // Already exists — update scheduled_at and team names if we now have them
      if (teamA && teamB) {
        await pool.query(
          `UPDATE matches SET scheduled_at=$1, team_a=$2, team_b=$3, flag_a=$4, flag_b=$5
           WHERE stage=$6 AND scheduled_at=$1`,
          [utcDate, teamA, teamB, flagA, flagB, stage]
        );
        console.log(`↻ UPDATE: [${stage}] ${teamA} vs ${teamB}`);
      } else {
        console.log(`- SKIP (exists, TBD): [${stage}] ${utcDate}`);
      }
      updated++;
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${updated} already existed`);
  await pool.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
