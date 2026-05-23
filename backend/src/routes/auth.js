const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('../db/pool');

const router = express.Router();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/api/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  console.log('[OAuth] callback hit, profile id:', profile?.id, 'email:', profile?.emails?.[0]?.value);
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [profile.id]
    );

    if (rows.length > 0) {
      // Update name/avatar in case they changed
      const { rows: updated } = await pool.query(
        'UPDATE users SET name=$1, avatar=$2 WHERE google_id=$3 RETURNING *',
        [profile.displayName, profile.photos?.[0]?.value, profile.id]
      );
      return done(null, updated[0]);
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const email = profile.emails?.[0]?.value;
    const role = email === adminEmail ? 'admin' : 'player';

    const { rows: newUser } = await pool.query(
      'INSERT INTO users (google_id, name, email, avatar, role) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [profile.id, profile.displayName, email, profile.photos?.[0]?.value, role]
    );

    await pool.query(
      'INSERT INTO leaderboard (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [newUser[0].id]
    );

    done(null, newUser[0]);
  } catch (err) {
    console.error('[OAuth] strategy error:', err.message);
    done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, rows[0] || null);
  } catch (err) {
    done(err);
  }
});

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
      console.log('[OAuth callback] err:', err?.message, '| user:', user?.id, '| info:', JSON.stringify(info));
      if (err || !user) return res.redirect(`${process.env.CLIENT_URL}/?auth_error=1`);
      req.logIn(user, (loginErr) => {
        if (loginErr) { console.error('[OAuth login] error:', loginErr.message); return next(loginErr); }
        console.log('[OAuth] login success, user:', user.id, user.email);
        res.redirect(process.env.CLIENT_URL || '/');
      });
    })(req, res, next);
  }
);

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({ user: null });
  const { id, name, email, avatar, role } = req.user;
  res.json({ user: { id, name, email, avatar, role } });
});

router.post('/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

module.exports = router;
