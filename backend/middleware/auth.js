const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'megabet_super_secret_dev';

/**
 * Middleware de autenticación JWT.
 * Adjunta req.user = { id, username } si el token es válido.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Token requerido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { requireAuth, JWT_SECRET };
