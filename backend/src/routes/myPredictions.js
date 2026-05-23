const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.*,
        p.predicted_a, p.predicted_b, p.points_earned
      FROM matches m
      LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = $1
      WHERE m.stage = 'group'
      ORDER BY m.scheduled_at ASC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
