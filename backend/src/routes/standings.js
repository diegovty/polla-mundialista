const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All 48 teams with their group and flag
const ALL_TEAMS = {
  A: [
    { name: 'Mexico',       flag: '🇲🇽' },
    { name: 'South Africa', flag: '🇿🇦' },
    { name: 'South Korea',  flag: '🇰🇷' },
    { name: 'Czechia',      flag: '🇨🇿' },
  ],
  B: [
    { name: 'Canada',              flag: '🇨🇦' },
    { name: 'Switzerland',         flag: '🇨🇭' },
    { name: 'Qatar',               flag: '🇶🇦' },
    { name: 'Bosnia-Herzegovina',  flag: '🇧🇦' },
  ],
  C: [
    { name: 'Brazil',   flag: '🇧🇷' },
    { name: 'Morocco',  flag: '🇲🇦' },
    { name: 'Haiti',    flag: '🇭🇹' },
    { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  ],
  D: [
    { name: 'United States', flag: '🇺🇸' },
    { name: 'Paraguay',      flag: '🇵🇾' },
    { name: 'Australia',     flag: '🇦🇺' },
    { name: 'Türkiye',       flag: '🇹🇷' },
  ],
  E: [
    { name: 'Germany',        flag: '🇩🇪' },
    { name: "Côte d'Ivoire",  flag: '🇨🇮' },
    { name: 'Curaçao',        flag: '🇨🇼' },
    { name: 'Ecuador',        flag: '🇪🇨' },
  ],
  F: [
    { name: 'Netherlands', flag: '🇳🇱' },
    { name: 'Japan',       flag: '🇯🇵' },
    { name: 'Tunisia',     flag: '🇹🇳' },
    { name: 'Sweden',      flag: '🇸🇪' },
  ],
  G: [
    { name: 'Belgium',     flag: '🇧🇪' },
    { name: 'Egypt',       flag: '🇪🇬' },
    { name: 'Iran',        flag: '🇮🇷' },
    { name: 'New Zealand', flag: '🇳🇿' },
  ],
  H: [
    { name: 'Spain',        flag: '🇪🇸' },
    { name: 'Uruguay',      flag: '🇺🇾' },
    { name: 'Saudi Arabia', flag: '🇸🇦' },
    { name: 'Cabo Verde',   flag: '🇨🇻' },
  ],
  I: [
    { name: 'France',   flag: '🇫🇷' },
    { name: 'Senegal',  flag: '🇸🇳' },
    { name: 'Norway',   flag: '🇳🇴' },
    { name: 'Iraq',     flag: '🇮🇶' },
  ],
  J: [
    { name: 'Argentina', flag: '🇦🇷' },
    { name: 'Algeria',   flag: '🇩🇿' },
    { name: 'Austria',   flag: '🇦🇹' },
    { name: 'Jordan',    flag: '🇯🇴' },
  ],
  K: [
    { name: 'Portugal',   flag: '🇵🇹' },
    { name: 'Colombia',   flag: '🇨🇴' },
    { name: 'Uzbekistan', flag: '🇺🇿' },
    { name: 'Congo DR',   flag: '🇨🇩' },
  ],
  L: [
    { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { name: 'Croatia', flag: '🇭🇷' },
    { name: 'Ghana',   flag: '🇬🇭' },
    { name: 'Panama',  flag: '🇵🇦' },
  ],
};

router.get('/', requireAuth, async (req, res) => {
  try {
    // Build base standings from all teams (0s for everyone)
    const standings = {};
    for (const [group, teams] of Object.entries(ALL_TEAMS)) {
      standings[group] = teams.map(t => ({
        name: t.name, flag: t.flag,
        mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0,
      }));
    }

    // Apply finished match results
    const { rows: matches } = await pool.query(
      `SELECT team_a, team_b, score_a, score_b, group_name
       FROM matches
       WHERE stage = 'group' AND status = 'finished'
         AND score_a IS NOT NULL AND score_b IS NOT NULL`
    );

    for (const m of matches) {
      const group = standings[m.group_name];
      if (!group) continue;
      const teamA = group.find(t => t.name === m.team_a);
      const teamB = group.find(t => t.name === m.team_b);
      if (!teamA || !teamB) continue;

      teamA.mp++; teamB.mp++;
      teamA.gf += m.score_a; teamA.ga += m.score_b;
      teamB.gf += m.score_b; teamB.ga += m.score_a;

      if (m.score_a > m.score_b) {
        teamA.w++; teamA.pts += 3; teamB.l++;
      } else if (m.score_a < m.score_b) {
        teamB.w++; teamB.pts += 3; teamA.l++;
      } else {
        teamA.d++; teamA.pts++;
        teamB.d++; teamB.pts++;
      }
    }

    // Sort each group: pts → GD → GF
    for (const group of Object.values(standings)) {
      group.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const gdB = b.gf - b.ga, gdA = a.gf - a.ga;
        if (gdB !== gdA) return gdB - gdA;
        return b.gf - a.gf;
      });
    }

    // Tournament-level stats
    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'finished') AS matches_played,
        COUNT(*) FILTER (WHERE status = 'live') AS matches_live,
        COUNT(*) FILTER (WHERE status = 'upcoming') AS matches_upcoming,
        COALESCE(SUM(score_a + score_b) FILTER (WHERE status = 'finished'), 0) AS total_goals
      FROM matches WHERE stage = 'group'
    `);

    // Polla stats
    const { rows: [pollaStats] } = await pool.query(`
      SELECT
        COUNT(DISTINCT user_id) AS total_players,
        COUNT(*) AS total_predictions,
        COUNT(*) FILTER (WHERE points_earned = 3) AS total_exact,
        COUNT(*) FILTER (WHERE points_earned = 1) AS total_correct
      FROM predictions
    `);

    // Top predictor per matchday (most pts earned in matchday)
    const { rows: matchdayLeaders } = await pool.query(`
      SELECT m.matchday, u.name, u.avatar, SUM(p.points_earned) AS pts
      FROM predictions p
      JOIN matches m ON m.id = p.match_id
      JOIN users u ON u.id = p.user_id
      WHERE m.stage = 'group' AND m.status = 'finished'
      GROUP BY m.matchday, u.id, u.name, u.avatar
      ORDER BY m.matchday, pts DESC
    `);

    // Keep only leader per matchday
    const jornada = {};
    for (const row of matchdayLeaders) {
      if (!jornada[row.matchday]) jornada[row.matchday] = row;
    }

    res.json({
      standings,
      tournament: {
        matches_played: parseInt(stats.matches_played),
        matches_live: parseInt(stats.matches_live),
        matches_upcoming: parseInt(stats.matches_upcoming),
        total_goals: parseInt(stats.total_goals),
      },
      polla: {
        total_players: parseInt(pollaStats.total_players),
        total_predictions: parseInt(pollaStats.total_predictions),
        total_exact: parseInt(pollaStats.total_exact),
        total_correct: parseInt(pollaStats.total_correct),
      },
      jornada_leaders: jornada,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
