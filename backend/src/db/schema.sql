CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  avatar VARCHAR,
  role VARCHAR DEFAULT 'player',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  stage VARCHAR NOT NULL DEFAULT 'group',
  group_name VARCHAR,
  matchday INTEGER DEFAULT 1,
  match_number INTEGER,
  team_a VARCHAR NOT NULL,
  team_b VARCHAR NOT NULL,
  flag_a VARCHAR,
  flag_b VARCHAR,
  scheduled_at TIMESTAMP NOT NULL,
  venue VARCHAR,
  score_a INTEGER,
  score_b INTEGER,
  status VARCHAR DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  predicted_a INTEGER NOT NULL,
  predicted_b INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

CREATE TABLE IF NOT EXISTS leaderboard (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  total_points INTEGER DEFAULT 0,
  exact_scores INTEGER DEFAULT 0,
  correct_outcomes INTEGER DEFAULT 0,
  predictions_made INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
