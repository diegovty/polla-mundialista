require('dotenv').config();
const { pool } = require('./pool');
const { generateFixtures } = require('../data/fixtures');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query("SELECT COUNT(*) FROM matches WHERE stage = 'group'");
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('Fixtures already seeded. Skipping.');
      return;
    }

    const fixtures = generateFixtures();
    for (const f of fixtures) {
      await client.query(
        `INSERT INTO matches (stage, group_name, matchday, match_number, team_a, team_b, flag_a, flag_b, scheduled_at, venue)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [f.stage, f.group_name, f.matchday, f.match_number, f.team_a, f.team_b,
         f.flag_a, f.flag_b, f.scheduled_at, f.venue]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${fixtures.length} group stage matches`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
