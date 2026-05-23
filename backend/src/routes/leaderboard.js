const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.name, u.avatar, u.id as user_id
       FROM leaderboard l
       JOIN users u ON u.id = l.user_id
       ORDER BY l.total_points DESC, l.exact_scores DESC, l.correct_outcomes DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
