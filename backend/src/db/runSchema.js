require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function runSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Schema created successfully');
  } catch (err) {
    console.error('Schema error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSchema();
