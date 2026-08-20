const db = require('../db/database');

const PRESTIGE_THRESHOLD = 3000;
const PRESTIGE_RESET_TOKENS = 100;

/**
 * checkPrestige(userId)
 * Llama esta función DESPUÉS de sumar tokens a un usuario.
 * Si supera 3000 → resetea a 100 y suma +1 medalla de prestigio.
 * Retorna { prestiged: bool, newMedals: number }
 */
function checkPrestige(userId) {
  const user = db.prepare('SELECT tokens, prestige_medals FROM users WHERE id = ?').get(userId);
  if (!user) return { prestiged: false };

  if (user.tokens >= PRESTIGE_THRESHOLD) {
    db.prepare(`
      UPDATE users
      SET tokens = ?, prestige_medals = prestige_medals + 1
      WHERE id = ?
    `).run(PRESTIGE_RESET_TOKENS, userId);

    const updated = db.prepare('SELECT prestige_medals FROM users WHERE id = ?').get(userId);
    console.log(`🏅 Prestige! Usuario ${userId} ahora tiene ${updated.prestige_medals} medalla(s)`);
    return { prestiged: true, newMedals: updated.prestige_medals };
  }

  return { prestiged: false };
}

module.exports = { checkPrestige };
