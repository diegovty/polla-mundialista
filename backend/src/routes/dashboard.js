const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // My prediction totals across all stages
    const { rows: [totals] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE p.points_earned = 3) AS exact,
        COUNT(*) FILTER (WHERE p.points_earned = 1) AS correct,
        COUNT(*) FILTER (WHERE p.points_earned = 0 AND m.status = 'finished') AS wrong
      FROM predictions p
      JOIN matches m ON m.id = p.match_id
      WHERE p.user_id = $1 AND m.status = 'finished'
    `, [userId]);

    const totalExact   = parseInt(totals.exact   || 0);
    const totalCorrect = parseInt(totals.correct || 0);
    const totalWrong   = parseInt(totals.wrong   || 0);

    // Points by matchday (group stage only — knockouts don't have matchday)
    const { rows: byDay } = await pool.query(`
      SELECT m.matchday,
        COALESCE(SUM(p.points_earned), 0) AS pts
      FROM predictions p
      JOIN matches m ON m.id = p.match_id
      WHERE p.user_id = $1 AND m.stage = 'group' AND m.status = 'finished'
      GROUP BY m.matchday
      ORDER BY m.matchday
    `, [userId]);

    // Goals per matchday
    const { rows: goalsByDay } = await pool.query(`
      SELECT matchday, COALESCE(SUM(score_a + score_b), 0) AS goals
      FROM matches
      WHERE stage = 'group' AND status = 'finished'
        AND score_a IS NOT NULL AND score_b IS NOT NULL
      GROUP BY matchday
      ORDER BY matchday
    `);

    // Tournament overview — all stages
    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'finished')  AS matches_played,
        COUNT(*) FILTER (WHERE status = 'live')      AS matches_live,
        COUNT(*) FILTER (WHERE status = 'upcoming')  AS matches_upcoming,
        COALESCE(SUM(score_a + score_b) FILTER (WHERE status = 'finished'), 0) AS total_goals
      FROM matches
    `);

    // Next 5 upcoming matches
    const { rows: nextMatches } = await pool.query(`
      SELECT * FROM matches
      WHERE status = 'upcoming' AND scheduled_at > NOW()
      ORDER BY scheduled_at ASC
      LIMIT 5
    `);

    res.json({
      my_stats: { exact: totalExact, correct: totalCorrect, wrong: totalWrong, by_day: byDay },
      tournament: {
        matches_played:  parseInt(stats.matches_played),
        matches_live:    parseInt(stats.matches_live),
        matches_upcoming: parseInt(stats.matches_upcoming),
        total_goals:     parseInt(stats.total_goals),
        goals_by_day:    goalsByDay,
      },
      next_matches: nextMatches,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
