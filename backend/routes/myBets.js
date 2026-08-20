const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// GET /api/my-bets/created — Apuestas que YO creé
// ============================================================
router.get('/created', requireAuth, (req, res) => {
  const bets = db.prepare(`
    SELECT b.*,
           (SELECT COUNT(*) FROM user_bets ub WHERE ub.bet_id = b.id) AS total_players,
           (SELECT SUM(ub.amount) FROM user_bets ub WHERE ub.bet_id = b.id) AS total_pool
    FROM bets b
    WHERE b.creator_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);

  const getOptions = db.prepare('SELECT * FROM bet_options WHERE bet_id = ? ORDER BY id');

  const result = bets.map((bet) => ({
    ...bet,
    options: getOptions.all(bet.id),
  }));

  return res.json({ bets: result });
});

// ============================================================
// GET /api/my-bets/history — Historial de apuestas que JUGUÉ
// Incluye: cuota fijada, monto, estado, PNL
// ============================================================
router.get('/history', requireAuth, (req, res) => {
  const history = db.prepare(`
    SELECT
      ub.*,
      b.title        AS bet_title,
      b.status       AS bet_status,
      b.image_url    AS bet_image,
      b.winning_option_id,
      bo.label       AS option_label,
      bo.color       AS option_color,
      bo.current_odds AS current_odds,
      creator.username AS creator_username
    FROM user_bets ub
    JOIN bets b          ON ub.bet_id  = b.id
    JOIN bet_options bo   ON ub.option_id = bo.id
    JOIN users creator    ON b.creator_id = creator.id
    WHERE ub.user_id = ?
    ORDER BY ub.placed_at DESC
  `).all(req.user.id);

  return res.json({ history });
});

module.exports = router;
