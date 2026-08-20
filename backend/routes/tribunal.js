const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// GET /api/tribunal — Apuestas denunciadas pendientes
// ============================================================
router.get('/', requireAuth, (req, res) => {
  const reports = db.prepare(`
    SELECT
      tr.*,
      b.title      AS bet_title,
      b.image_url  AS bet_image,
      b.status     AS bet_status,
      u.username   AS reporter_username,
      (SELECT COUNT(*) FROM tribunal_votes tv WHERE tv.report_id = tr.id) AS total_votes,
      (SELECT COUNT(*) FROM users) AS total_users
    FROM tribunal_reports tr
    JOIN bets  b ON tr.bet_id      = b.id
    JOIN users u ON tr.reporter_id = u.id
    WHERE tr.status = 'pending'
    ORDER BY tr.created_at DESC
  `).all();

  const getVotes = db.prepare(`
    SELECT tv.*, u.username
    FROM tribunal_votes tv
    JOIN users u ON tv.voter_id = u.id
    WHERE tv.report_id = ?
  `);

  const getUserVote = db.prepare(
    'SELECT vote FROM tribunal_votes WHERE report_id = ? AND voter_id = ?'
  );

  const getBetOptions = db.prepare('SELECT * FROM bet_options WHERE bet_id = ? ORDER BY id');

  const result = reports.map((r) => ({
    ...r,
    votes: getVotes.all(r.id),
    my_vote: getUserVote.get(r.id, req.user.id)?.vote || null,
    bet_options: getBetOptions.all(r.bet_id),
  }));

  return res.json({ reports: result });
});

// ============================================================
// POST /api/tribunal/report — Denunciar una apuesta
// Body: { bet_id, reason }
// ============================================================
router.post('/report', requireAuth, (req, res) => {
  const { bet_id, reason } = req.body;
  const userId = req.user.id;

  if (!bet_id || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'bet_id y reason son requeridos.' });
  }

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(bet_id);
  if (!bet) return res.status(404).json({ error: 'Apuesta no encontrada.' });
  if (bet.creator_id === userId) {
    return res.status(403).json({ error: 'No puedes denunciar tu propia apuesta, crack.' });
  }
  if (bet.status === 'annulled') {
    return res.status(400).json({ error: 'Esta apuesta ya fue anulada.' });
  }

  // Solo un reporte pendiente por apuesta
  const existing = db.prepare(
    "SELECT id FROM tribunal_reports WHERE bet_id = ? AND status = 'pending'"
  ).get(bet_id);
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una denuncia pendiente para esta apuesta.' });
  }

  const result = db.prepare(`
    INSERT INTO tribunal_reports (bet_id, reporter_id, reason)
    VALUES (?, ?, ?)
  `).run(bet_id, userId, reason.trim());

  return res.status(201).json({
    message: '⚖️ Denuncia enviada al Tribunal. La justicia tarda pero llega.',
    report_id: result.lastInsertRowid,
  });
});

// ============================================================
// POST /api/tribunal/:reportId/vote — Votar en el tribunal
// Body: { vote: 'annul' | 'maintain' }
// ============================================================
router.post('/:reportId/vote', requireAuth, (req, res) => {
  const reportId = parseInt(req.params.reportId);
  const { vote } = req.body;
  const userId = req.user.id;

  if (!['annul', 'maintain'].includes(vote)) {
    return res.status(400).json({ error: 'Voto inválido. Debe ser "annul" o "maintain".' });
  }

  const tribunalVote = db.transaction(() => {
    const report = db.prepare('SELECT * FROM tribunal_reports WHERE id = ?').get(reportId);
    if (!report) throw { status: 404, message: 'Reporte no encontrado.' };
    if (report.status !== 'pending') throw { status: 400, message: 'Este reporte ya fue resuelto.' };

    // No puede votar el denunciante ni el creador de la apuesta
    const bet = db.prepare('SELECT creator_id FROM bets WHERE id = ?').get(report.bet_id);
    if (report.reporter_id === userId) throw { status: 403, message: 'No puedes votar en tu propio reporte.' };
    if (bet.creator_id === userId) throw { status: 403, message: 'El creador de la apuesta no puede votar en su tribunal.' };

    // Verificar que no votó ya
    const existing = db.prepare(
      'SELECT id FROM tribunal_votes WHERE report_id = ? AND voter_id = ?'
    ).get(reportId, userId);
    if (existing) throw { status: 400, message: 'Ya votaste en este tribunal.' };

    // Registrar voto
    db.prepare(`
      INSERT INTO tribunal_votes (report_id, voter_id, vote) VALUES (?, ?, ?)
    `).run(reportId, userId, vote);

    // Contar votos actuales
    const votes = db.prepare('SELECT vote FROM tribunal_votes WHERE report_id = ?').all(reportId);
    const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const annulVotes = votes.filter((v) => v.vote === 'annul').length;
    const maintainVotes = votes.filter((v) => v.vote === 'maintain').length;
    const totalVotes = votes.length;

    // Mayoría simple = más de la mitad de los usuarios
    const majority = Math.floor(totalUsers / 2) + 1;
    let verdict = null;

    if (annulVotes >= majority) {
      verdict = 'annul';
    } else if (maintainVotes >= majority) {
      verdict = 'maintain';
    }

    let refundedUsers = [];

    if (verdict) {
      // Resolver el tribunal
      db.prepare(`
        UPDATE tribunal_reports
        SET status = 'resolved', verdict = ?, resolved_at = datetime('now')
        WHERE id = ?
      `).run(verdict, reportId);

      if (verdict === 'annul') {
        // ANULAR: devolver tokens a todos los participantes
        const userBets = db.prepare(
          "SELECT * FROM user_bets WHERE bet_id = ? AND status = 'pending'"
        ).all(report.bet_id);

        for (const ub of userBets) {
          db.prepare('UPDATE users SET tokens = tokens + ? WHERE id = ?').run(ub.amount, ub.user_id);
          db.prepare("UPDATE user_bets SET status = 'refunded', pnl = 0 WHERE id = ?").run(ub.id);
          refundedUsers.push(ub.user_id);
        }

        db.prepare("UPDATE bets SET status = 'annulled' WHERE id = ?").run(report.bet_id);
      }
    }

    return { vote, totalVotes, annulVotes, maintainVotes, totalUsers, verdict, refundedUsers };
  });

  try {
    const result = tribunalVote();
    let message = `Voto registrado (${result.totalVotes}/${result.totalUsers} han votado)`;
    if (result.verdict === 'annul') message = `⚖️ ANULADA. Se devolvieron tokens a ${result.refundedUsers.length} participantes.`;
    if (result.verdict === 'maintain') message = `✅ Resultado MANTENIDO. El veredicto es firme.`;

    return res.json({
      message,
      your_vote: result.vote,
      votes: { annul: result.annulVotes, maintain: result.maintainVotes },
      total_voters: result.totalVotes,
      total_users: result.totalUsers,
      verdict: result.verdict,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error en tribunal:', err);
    return res.status(500).json({ error: 'Error interno en el tribunal.' });
  }
});

module.exports = router;
