const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows: matches } = await pool.query(
      `SELECT m.*,
        p.predicted_a, p.predicted_b, p.points_earned
       FROM matches m
       LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = $1
       ORDER BY m.scheduled_at ASC`,
      [req.user.id]
    );
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*,
        p.predicted_a, p.predicted_b, p.points_earned
       FROM matches m
       LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = $1
       WHERE m.id = $2`,
      [req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Match not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all predictions for a match (only once it has started)
router.get('/:id/predictions', requireAuth, async (req, res) => {
  try {
    const { rows: [match] } = await pool.query(
      'SELECT status FROM matches WHERE id=$1', [req.params.id]
    );
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status === 'upcoming') {
      return res.status(403).json({ error: 'El partido aún no ha comenzado' });
    }
    const { rows } = await pool.query(
      `SELECT p.predicted_a, p.predicted_b, p.points_earned,
              u.name, u.avatar
       FROM predictions p
       JOIN users u ON u.id = p.user_id
       WHERE p.match_id = $1
       ORDER BY COALESCE(p.points_earned, -1) DESC, u.name ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: set match result and calculate points
router.put('/:id/result', requireAdmin, async (req, res) => {
  const { score_a, score_b, status } = req.body;
  if (score_a == null || score_b == null) {
    return res.status(400).json({ error: 'score_a and score_b required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE matches SET score_a=$1, score_b=$2, status=$3 WHERE id=$4',
      [score_a, score_b, status || 'finished', req.params.id]
    );

    // Recalculate points for all predictions on this match
    const { rows: preds } = await client.query(
      'SELECT * FROM predictions WHERE match_id = $1',
      [req.params.id]
    );

    for (const pred of preds) {
      let pts = 0;
      const exactA = pred.predicted_a === score_a;
      const exactB = pred.predicted_b === score_b;
      if (exactA && exactB) {
        pts = 3;
      } else {
        const realOutcome = Math.sign(score_a - score_b);
        const predOutcome = Math.sign(pred.predicted_a - pred.predicted_b);
        if (realOutcome === predOutcome) pts = 1;
      }

      await client.query(
        'UPDATE predictions SET points_earned=$1 WHERE id=$2',
        [pts, pred.id]
      );

      // Recalculate leaderboard for this user
      const { rows: stats } = await client.query(
        `SELECT
          COALESCE(SUM(points_earned),0) AS total_points,
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

    // Emit real-time updates
    const io = req.app.get('io');
    const { rows: updatedMatch } = await pool.query('SELECT * FROM matches WHERE id=$1', [req.params.id]);
    const { rows: leaderboard } = await pool.query(
      `SELECT l.*, u.name, u.avatar FROM leaderboard l
       JOIN users u ON u.id = l.user_id
       ORDER BY l.total_points DESC, l.exact_scores DESC`
    );
    io.emit('match:updated', updatedMatch[0]);
    io.emit('leaderboard:updated', leaderboard);

    res.json({ ok: true, match: updatedMatch[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Admin: update match schedule/venue
router.put('/:id', requireAdmin, async (req, res) => {
  const { scheduled_at, venue, team_a, team_b, flag_a, flag_b, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE matches SET
        scheduled_at=COALESCE($1, scheduled_at),
        venue=COALESCE($2, venue),
        team_a=COALESCE($3, team_a),
        team_b=COALESCE($4, team_b),
        flag_a=COALESCE($5, flag_a),
        flag_b=COALESCE($6, flag_b),
        status=COALESCE($7, status)
       WHERE id=$8 RETURNING *`,
      [scheduled_at, venue, team_a, team_b, flag_a, flag_b, status, req.params.id]
    );
    const io = req.app.get('io');
    io.emit('match:updated', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: add knockout match
router.post('/', requireAdmin, async (req, res) => {
  const { stage, team_a, team_b, flag_a, flag_b, scheduled_at, venue } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO matches (stage, team_a, team_b, flag_a, flag_b, scheduled_at, venue)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [stage || 'knockout', team_a, team_b, flag_a || '🏳️', flag_b || '🏳️', scheduled_at, venue]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
