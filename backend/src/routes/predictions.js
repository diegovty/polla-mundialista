const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const { match_id, predicted_a, predicted_b } = req.body;
  if (match_id == null || predicted_a == null || predicted_b == null) {
    return res.status(400).json({ error: 'match_id, predicted_a, predicted_b required' });
  }
  if (predicted_a < 0 || predicted_b < 0) {
    return res.status(400).json({ error: 'Scores must be non-negative' });
  }

  try {
    const { rows: matchRows } = await pool.query(
      "SELECT status, scheduled_at FROM matches WHERE id=$1",
      [match_id]
    );
    if (!matchRows.length) return res.status(404).json({ error: 'Match not found' });
    if (matchRows[0].status !== 'upcoming') {
      return res.status(400).json({ error: 'Match already started — predictions are locked' });
    }
    if (new Date(matchRows[0].scheduled_at) <= new Date()) {
      return res.status(400).json({ error: 'Match already started — predictions are locked' });
    }

    const { rows } = await pool.query(
      `INSERT INTO predictions (user_id, match_id, predicted_a, predicted_b)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, match_id) DO UPDATE
         SET predicted_a=$3, predicted_b=$4, updated_at=NOW()
       RETURNING *`,
      [req.user.id, match_id, predicted_a, predicted_b]
    );

    // Update predictions_made in leaderboard
    await pool.query(
      `INSERT INTO leaderboard (user_id, predictions_made)
       VALUES ($1, (SELECT COUNT(*) FROM predictions WHERE user_id=$1))
       ON CONFLICT (user_id) DO UPDATE
         SET predictions_made=(SELECT COUNT(*) FROM predictions WHERE user_id=$1)`,
      [req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, m.team_a, m.team_b, m.flag_a, m.flag_b,
        m.score_a, m.score_b, m.status, m.scheduled_at, m.stage, m.group_name
       FROM predictions p
       JOIN matches m ON m.id = p.match_id
       WHERE p.user_id = $1
       ORDER BY m.scheduled_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
