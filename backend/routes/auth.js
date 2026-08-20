const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      tokens: user.tokens,
      prestige_medals: user.prestige_medals,
      avatar_url: user.avatar_url,
    },
  });
});

// GET /api/auth/me — Refresca datos del usuario autenticado
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, tokens, prestige_medals, avatar_url FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json({ user });
});

module.exports = router;
