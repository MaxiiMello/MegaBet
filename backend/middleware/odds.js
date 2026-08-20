/**
 * odds.js — Lógica de cuotas dinámicas
 *
 * Algoritmo:
 * - La cuota de cada opción es inversamente proporcional al % del pool total
 *   que tiene esa opción.
 * - Se aplica un margen de la casa (HOUSE_EDGE) para que la suma de probabilidades
 *   implícitas siempre sea > 1 (la banca siempre tiene ventaja).
 * - Si una opción no tiene apuestas aún, se mantiene su cuota inicial.
 * - La cuota mínima es 1.05 (siempre se gana algo).
 */

const HOUSE_EDGE = 0.05; // 5% de margen de la casa
const MIN_ODDS   = 1.05;

/**
 * recalculateOdds(options)
 * @param {Array} options - Array de { id, initial_odds, total_wagered }
 * @returns {Map<id, newOdds>}
 */
function recalculateOdds(options) {
  const totalPool = options.reduce((sum, o) => sum + o.total_wagered, 0);
  const newOddsMap = new Map();

  for (const opt of options) {
    let odds;
    if (totalPool === 0 || opt.total_wagered === 0) {
      // Sin apuestas aún → mantener cuota inicial
      odds = opt.initial_odds;
    } else {
      // Probabilidad implícita = % que tiene esta opción del pool
      const impliedProb = opt.total_wagered / totalPool;
      // Cuota = 1 / probabilidad con margen de casa
      odds = (1 / impliedProb) * (1 - HOUSE_EDGE);
      odds = Math.max(odds, MIN_ODDS);
      // Redondear a 2 decimales
      odds = Math.round(odds * 100) / 100;
    }
    newOddsMap.set(opt.id, odds);
  }

  return newOddsMap;
}

module.exports = { recalculateOdds };
