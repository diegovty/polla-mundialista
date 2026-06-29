const cron = require('node-cron');
const axios = require('axios');
const { pool } = require('../db/pool');

const API_BASE = 'https://api.football-data.org/v4';

// Map football-data.org team names → our DB names
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

function normalizeName(name) {
  return NAME_MAP[name] || name;
}

// football-data.org status → our status
function mapStatus(apiStatus) {
  if (['IN_PLAY', 'PAUSED', 'HALFTIME', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(apiStatus)) return 'live';
  if (['FINISHED', 'AWARDED'].includes(apiStatus)) return 'finished';
  return null;
}

async function fetchTodayMatches() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return [];

  const today = new Date().toISOString().split('T')[0];
  const { data } = await axios.get(
    `${API_BASE}/competitions/WC/matches?dateFrom=${today}&dateTo=${today}`,
    { headers: { 'X-Auth-Token': key }, timeout: 10000 }
  );
  return data.matches || [];
}

const WC_START = new Date('2026-06-11T00:00:00Z');

async function hasTodayOrLiveMatches() {
  // Don't sync before the tournament starts
  if (new Date() < WC_START) return false;

  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM matches WHERE (scheduled_at BETWEEN $1 AND $2) OR status = 'live'`,
    [start, end]
  );
  return parseInt(rows[0].count) > 0;
}

async function findMatchInDB(homeTeam, awayTeam, utcDate) {
  const a = normalizeName(homeTeam);
  const b = normalizeName(awayTeam);

  // Try exact match in normal order
  let { rows } = await pool.query(
    'SELECT id, status, score_a, score_b FROM matches WHERE team_a=$1 AND team_b=$2',
    [a, b]
  );
  if (rows.length) return { match: rows[0], swapped: false };

  // Try exact match in swapped order
  ({ rows } = await pool.query(
    'SELECT id, status, score_a, score_b FROM matches WHERE team_a=$1 AND team_b=$2',
    [b, a]
  ));
  if (rows.length) return { match: rows[0], swapped: true };

  // Fallback: find a "Por definir" placeholder within ±3 hours of this match's time
  // and claim it by updating the team names and flags
  if (utcDate) {
    const matchTime = new Date(utcDate);
    const from = new Date(matchTime.getTime() - 3 * 60 * 60 * 1000);
    const to   = new Date(matchTime.getTime() + 3 * 60 * 60 * 1000);
    ({ rows } = await pool.query(
      `SELECT id, status, score_a, score_b FROM matches
       WHERE team_a = 'Por definir' AND scheduled_at BETWEEN $1 AND $2
       ORDER BY ABS(EXTRACT(EPOCH FROM (scheduled_at - $3::timestamptz)))
       LIMIT 1`,
      [from, to, matchTime]
    ));
    if (rows.length) {
      const flagA = FLAGS[a] || '🏳️';
      const flagB = FLAGS[b] || '🏳️';
      await pool.query(
        'UPDATE matches SET team_a=$1, team_b=$2, flag_a=$3, flag_b=$4 WHERE id=$5',
        [a, b, flagA, flagB, rows[0].id]
      );
      console.log(`[FootballSync] Claimed TBD match #${rows[0].id} → ${a} vs ${b}`);
      return { match: rows[0], swapped: false };
    }
  }

  return null;
}

async function recalculatePoints(matchId, scoreA, scoreB, io) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE matches SET score_a=$1, score_b=$2, status=$3 WHERE id=$4',
      [scoreA, scoreB, 'finished', matchId]
    );

    const { rows: preds } = await client.query(
      'SELECT * FROM predictions WHERE match_id=$1', [matchId]
    );

    for (const pred of preds) {
      let pts = 0;
      if (pred.predicted_a === scoreA && pred.predicted_b === scoreB) {
        pts = 3;
      } else {
        const real = Math.sign(scoreA - scoreB);
        const predicted = Math.sign(pred.predicted_a - pred.predicted_b);
        if (real === predicted) pts = 1;
      }
      await client.query('UPDATE predictions SET points_earned=$1 WHERE id=$2', [pts, pred.id]);

      const { rows: stats } = await client.query(
        `SELECT COALESCE(SUM(points_earned),0) AS total_points,
           COUNT(*) FILTER (WHERE points_earned=3) AS exact_scores,
           COUNT(*) FILTER (WHERE points_earned=1) AS correct_outcomes,
           COUNT(*) AS predictions_made
         FROM predictions WHERE user_id=$1`,
        [pred.user_id]
      );
      await client.query(
        `INSERT INTO leaderboard (user_id, total_points, exact_scores, correct_outcomes, predictions_made, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           total_points=$2, exact_scores=$3, correct_outcomes=$4, predictions_made=$5, updated_at=NOW()`,
        [pred.user_id, stats[0].total_points, stats[0].exact_scores,
         stats[0].correct_outcomes, stats[0].predictions_made]
      );
    }
    await client.query('COMMIT');

    const { rows: [match] } = await pool.query('SELECT * FROM matches WHERE id=$1', [matchId]);
    const { rows: board } = await pool.query(
      `SELECT l.*, u.name, u.avatar FROM leaderboard l
       JOIN users u ON u.id=l.user_id
       ORDER BY l.total_points DESC, l.exact_scores DESC`
    );
    io.emit('match:updated', match);
    io.emit('leaderboard:updated', board);
    console.log(`[FootballSync] Points calculated for match ${matchId}: ${scoreA}-${scoreB}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FootballSync] Point calc error:', err.message);
  } finally {
    client.release();
  }
}

async function processApiMatch(apiMatch, io) {
  const ourStatus = mapStatus(apiMatch.status);
  if (!ourStatus) return;

  const result = await findMatchInDB(apiMatch.homeTeam.name, apiMatch.awayTeam.name, apiMatch.utcDate);
  if (!result) {
    console.log(`[FootballSync] No DB match for: ${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name}`);
    return;
  }
  const { match, swapped } = result;

  // Extract current scores
  const raw = apiMatch.score;
  let homeScore, awayScore;
  if (ourStatus === 'finished') {
    homeScore = raw?.fullTime?.home ?? 0;
    awayScore = raw?.fullTime?.away ?? 0;
  } else {
    homeScore = raw?.regularTime?.home ?? raw?.halfTime?.home ?? 0;
    awayScore = raw?.regularTime?.away ?? raw?.halfTime?.away ?? 0;
  }
  const scoreA = swapped ? awayScore : homeScore;
  const scoreB = swapped ? homeScore : awayScore;

  // Skip if nothing changed
  if (match.status === ourStatus && match.score_a === scoreA && match.score_b === scoreB) return;

  if (ourStatus === 'finished') {
    // Always recalculate when finished — score may have been corrected after initial report
    await recalculatePoints(match.id, scoreA, scoreB, io);
  } else {
    await pool.query(
      'UPDATE matches SET status=$1, score_a=$2, score_b=$3 WHERE id=$4',
      [ourStatus, scoreA, scoreB, match.id]
    );
    const { rows: [updated] } = await pool.query('SELECT * FROM matches WHERE id=$1', [match.id]);
    io.emit('match:updated', updated);
    console.log(`[FootballSync] Live update: match ${match.id} → ${scoreA}-${scoreB} [${ourStatus}]`);
  }
}

let isSyncing = false;

async function sync(io) {
  if (!process.env.FOOTBALL_API_KEY) return;
  if (isSyncing) return;
  isSyncing = true;
  try {
    const active = await hasTodayOrLiveMatches();
    if (!active) return;
    const matches = await fetchTodayMatches();
    for (const m of matches) await processApiMatch(m, io);
  } catch (err) {
    console.error('[FootballSync] Sync error:', err.message);
  } finally {
    isSyncing = false;
  }
}

function startSync(io) {
  if (!process.env.FOOTBALL_API_KEY) {
    console.log('[FootballSync] No FOOTBALL_API_KEY — auto-sync disabled');
    return;
  }
  cron.schedule('* * * * *', () => sync(io));
  console.log('[FootballSync] Auto-sync started (every minute)');
}

module.exports = { startSync };
