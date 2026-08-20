const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { checkPrestige } = require('../middleware/prestige');
const { recalculateOdds } = require('../middleware/odds');
const upload = require('../middleware/upload');

const router = express.Router();

// ============================================================
// GET /api/bets — Listar todas las apuestas (con opciones)
// Query params: ?status=open|closed|resolved|annulled
// ============================================================
router.get('/', requireAuth, (req, res) => {
  const { status } = req.query;

  let query = `
    SELECT b.*, u.username AS creator_username, u.avatar_url AS creator_avatar
    FROM bets b
    JOIN users u ON b.creator_id = u.id
  `;
  const params = [];
  if (status) {
    query += ' WHERE b.status = ?';
    params.push(status);
  }
  query += ' ORDER BY b.created_at DESC';

  const bets = db.prepare(query).all(...params);

  // Adjuntar opciones a cada apuesta
  const getOptions = db.prepare('SELECT * FROM bet_options WHERE bet_id = ? ORDER BY id');
  const getUserBet = db.prepare(
    'SELECT * FROM user_bets WHERE user_id = ? AND bet_id = ?'
  );

  const result = bets.map((bet) => ({
    ...bet,
    options: getOptions.all(bet.id),
    my_bet: getUserBet.get(req.user.id, bet.id) || null,
  }));

  return res.json({ bets: result });
});

// ============================================================
// GET /api/bets/:id — Detalle de una apuesta
// ============================================================
router.get('/:id', requireAuth, (req, res) => {
  const bet = db.prepare(`
    SELECT b.*, u.username AS creator_username
    FROM bets b JOIN users u ON b.creator_id = u.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!bet) return res.status(404).json({ error: 'Apuesta no encontrada.' });

  const options = db.prepare('SELECT * FROM bet_options WHERE bet_id = ? ORDER BY id').all(bet.id);
  const myBet = db.prepare('SELECT * FROM user_bets WHERE user_id = ? AND bet_id = ?').get(req.user.id, bet.id);

  return res.json({ bet: { ...bet, options, my_bet: myBet || null } });
});

// ============================================================
// POST /api/bets — Crear nueva apuesta
// Body: { title, description, image_url?, options: [{label, color, initial_odds}] }
// O multipart/form-data con campo "image" para upload
// ============================================================
router.post('/', requireAuth, upload.single('image'), (req, res) => {
  let { title, description, image_url, options } = req.body;

  // Si se subió una imagen, usar su path
  if (req.file) {
    image_url = `/uploads/${req.file.filename}`;
  }

  // Parsear options si viene como string (multipart)
  if (typeof options === 'string') {
    try { options = JSON.parse(options); } catch {
      return res.status(400).json({ error: 'El campo "options" debe ser un JSON válido.' });
    }
  }

  // Validaciones
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'El título es requerido.' });
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 3) {
    return res.status(400).json({ error: 'Debes definir 2 o 3 opciones.' });
  }
  for (const opt of options) {
    if (!opt.label || !opt.label.trim()) {
      return res.status(400).json({ error: 'Cada opción debe tener un label.' });
    }
    const odds = parseFloat(opt.initial_odds);
    if (isNaN(odds) || odds < 1.05) {
      return res.status(400).json({ error: 'La cuota inicial mínima es 1.05.' });
    }
  }

  // Insertar en transacción atómica
  const createBet = db.transaction(() => {
    const betResult = db.prepare(`
      INSERT INTO bets (creator_id, title, description, image_url)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, title.trim(), description || null, image_url || null);

    const betId = betResult.lastInsertRowid;
    const colors = ['green', 'red', 'blue'];

    const insertOption = db.prepare(`
      INSERT INTO bet_options (bet_id, label, color, initial_odds, current_odds)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertedOptions = [];
    options.forEach((opt, i) => {
      const color = opt.color || colors[i];
      const odds = parseFloat(opt.initial_odds);
      const result = insertOption.run(betId, opt.label.trim(), color, odds, odds);
      insertedOptions.push({
        id: result.lastInsertRowid,
        bet_id: betId,
        label: opt.label.trim(),
        color,
        initial_odds: odds,
        current_odds: odds,
        total_wagered: 0,
      });
    });

    return { betId, insertedOptions };
  });

  const { betId, insertedOptions } = createBet();
  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);

  return res.status(201).json({
    message: 'Apuesta creada con éxito. ¡Que empiece el juego!',
    bet: { ...bet, options: insertedOptions },
  });
});

// ============================================================
// POST /api/bets/:id/place — Apostar en una opción
// Body: { option_id, amount }
// ============================================================
router.post('/:id/place', requireAuth, (req, res) => {
  const betId = parseInt(req.params.id);
  const { option_id, amount } = req.body;
  const userId = req.user.id;

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });
  }

  const placeBet = db.transaction(() => {
    // 1. Verificar que la apuesta existe y está abierta
    const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);
    if (!bet) throw { status: 404, message: 'Apuesta no encontrada.' };
    if (bet.status !== 'open') throw { status: 400, message: 'Esta apuesta ya no está abierta.' };

    // 2. No puede apostar el creador
    if (bet.creator_id === userId) {
      throw { status: 403, message: 'No puedes apostar en tu propia apuesta, tramposo.' };
    }

    // 3. Verificar que no apostó ya
    const existingBet = db.prepare('SELECT id FROM user_bets WHERE user_id = ? AND bet_id = ?').get(userId, betId);
    if (existingBet) throw { status: 400, message: 'Ya apostaste en esta apuesta.' };

    // 4. Verificar que la opción pertenece a esta apuesta
    const option = db.prepare('SELECT * FROM bet_options WHERE id = ? AND bet_id = ?').get(option_id, betId);
    if (!option) throw { status: 404, message: 'Opción inválida.' };

    // 5. Verificar saldo suficiente
    const user = db.prepare('SELECT tokens FROM users WHERE id = ?').get(userId);
    if (user.tokens < amountNum) {
      throw { status: 400, message: `Saldo insuficiente. Tenés ${user.tokens} tokens.` };
    }

    // 6. Asegurar la cuota ACTUAL (la que vio el usuario al hacer clic)
    const lockedOdds = option.current_odds;
    const potentialWin = Math.round(amountNum * lockedOdds * 100) / 100;

    // 7. Descontar tokens del usuario
    db.prepare('UPDATE users SET tokens = tokens - ? WHERE id = ?').run(amountNum, userId);

    // 8. Registrar la apuesta
    db.prepare(`
      INSERT INTO user_bets (user_id, bet_id, option_id, amount, locked_odds, potential_win)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, betId, option_id, amountNum, lockedOdds, potentialWin);

    // 9. Actualizar total_wagered de la opción
    db.prepare('UPDATE bet_options SET total_wagered = total_wagered + ? WHERE id = ?')
      .run(amountNum, option_id);

    // 10. Recalcular cuotas dinámicas de TODAS las opciones de esta apuesta
    const allOptions = db.prepare('SELECT * FROM bet_options WHERE bet_id = ?').all(betId);
    const newOddsMap = recalculateOdds(allOptions);

    const updateOdds = db.prepare('UPDATE bet_options SET current_odds = ? WHERE id = ?');
    for (const [id, newOdds] of newOddsMap) {
      updateOdds.run(newOdds, id);
    }

    // Devolver estado actualizado
    const updatedUser = db.prepare('SELECT tokens, prestige_medals FROM users WHERE id = ?').get(userId);
    const updatedOptions = db.prepare('SELECT * FROM bet_options WHERE bet_id = ?').all(betId);

    return { lockedOdds, potentialWin, updatedUser, updatedOptions };
  });

  try {
    const result = placeBet();
    return res.json({
      message: `Apuesta registrada. Cuota fijada: ${result.lockedOdds}x — Ganancia potencial: ${result.potentialWin} tokens 🤑`,
      locked_odds: result.lockedOdds,
      potential_win: result.potentialWin,
      your_tokens: result.updatedUser.tokens,
      updated_options: result.updatedOptions,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error al apostar:', err);
    return res.status(500).json({ error: 'Error interno al procesar la apuesta.' });
  }
});

// ============================================================
// POST /api/bets/:id/resolve — Declarar ganador (solo el creador)
// Body: { winning_option_id }
// ============================================================
router.post('/:id/resolve', requireAuth, (req, res) => {
  const betId = parseInt(req.params.id);
  const { winning_option_id } = req.body;
  const userId = req.user.id;

  const resolve = db.transaction(() => {
    const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);
    if (!bet) throw { status: 404, message: 'Apuesta no encontrada.' };
    if (bet.creator_id !== userId) throw { status: 403, message: 'Solo el creador puede declarar el ganador.' };
    if (bet.status !== 'open') throw { status: 400, message: 'La apuesta ya fue resuelta o anulada.' };

    const winOption = db.prepare('SELECT * FROM bet_options WHERE id = ? AND bet_id = ?').get(winning_option_id, betId);
    if (!winOption) throw { status: 404, message: 'Opción ganadora inválida.' };

    // Marcar apuesta como resuelta
    db.prepare(`
      UPDATE bets SET status = 'resolved', winning_option_id = ?, resolved_at = datetime('now')
      WHERE id = ?
    `).run(winning_option_id, betId);

    // Obtener todos los user_bets de esta apuesta
    const allUserBets = db.prepare('SELECT * FROM user_bets WHERE bet_id = ?').all(betId);

    const prestigeResults = [];

    for (const ub of allUserBets) {
      if (ub.option_id === parseInt(winning_option_id)) {
        // GANÓ → acreditar potential_win
        const pnl = Math.round((ub.potential_win - ub.amount) * 100) / 100;
        db.prepare(`
          UPDATE user_bets SET status = 'won', pnl = ? WHERE id = ?
        `).run(pnl, ub.id);
        db.prepare('UPDATE users SET tokens = tokens + ? WHERE id = ?').run(ub.potential_win, ub.user_id);

        // Chequear prestige
        const pr = checkPrestige(ub.user_id);
        if (pr.prestiged) prestigeResults.push({ userId: ub.user_id, medals: pr.newMedals });
      } else {
        // PERDIÓ → pnl negativo
        const pnl = -ub.amount;
        db.prepare(`
          UPDATE user_bets SET status = 'lost', pnl = ? WHERE id = ?
        `).run(pnl, ub.id);
      }
    }

    return { winOption, totalBets: allUserBets.length, prestigeResults };
  });

  try {
    const result = resolve();
    return res.json({
      message: `✅ Ganador declarado: "${result.winOption.label}". Se acreditaron los premios.`,
      winning_option: result.winOption,
      total_bets_resolved: result.totalBets,
      prestige_events: result.prestigeResults,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error al resolver:', err);
    return res.status(500).json({ error: 'Error interno al resolver la apuesta.' });
  }
});

// ============================================================
// POST /api/bets/:id/close — Cerrar apuesta (no más votos)
// ============================================================
router.post('/:id/close', requireAuth, (req, res) => {
  const betId = parseInt(req.params.id);
  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(betId);

  if (!bet) return res.status(404).json({ error: 'Apuesta no encontrada.' });
  if (bet.creator_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede cerrar la apuesta.' });
  if (bet.status !== 'open') return res.status(400).json({ error: 'La apuesta no está abierta.' });

  db.prepare("UPDATE bets SET status = 'closed' WHERE id = ?").run(betId);
  return res.json({ message: 'Apuesta cerrada. Ya no se aceptan más votos.' });
});

module.exports = router;
