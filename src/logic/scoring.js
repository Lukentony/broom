// Traduzione da Python: homesync-clean/backend/logic/scoring.py (26 righe)
// Funzione pura: calcola i punti per un completamento

/**
 * Calcola i punti assegnati per un task completato.
 * @param {number} difficulty - Livello di difficoltà (1-5)
 * @param {string} assignmentType - Tipo di assegnazione (TOGETHER, FIXED_A, ecc.)
 * @param {number} [daysOverdue=0] - Giorni di ritardo
 * @param {number} [baseMultiplier=10] - Moltiplicatore base punti
 * @param {boolean} [splitShared=true] - Se dividere i punti per task condivisi
 * @returns {{ points: number, isShared: boolean }}
 */
export function calculatePoints(
  difficulty,
  assignmentType,
  daysOverdue = 0,
  baseMultiplier = 10,
  splitShared = true
) {
  const basePoints = difficulty * baseMultiplier;
  let points;

  if (daysOverdue > 1) {
    points = -basePoints;
  } else if (daysOverdue === 1) {
    points = 1;
  } else {
    points = basePoints;
  }

  const isShared = assignmentType === 'TOGETHER';
  if (isShared) {
    if (splitShared) {
      if (points > 0) {
        const share = Math.max(1, Math.floor(points / 2));
        return { points: share, isShared: true };
      } else {
        // Arrotondamento della divisione intera per i negativi
        const share = Math.floor(points / 2);
        return { points: share, isShared: true };
      }
    } else {
      return { points, isShared: true };
    }
  }

  return { points, isShared: false };
}

/**
 * Penalità automatica per un task lasciato scaduto senza completarlo
 * (diverso da calculatePoints: quello premia un completamento tardivo,
 * questo punisce il *non* completamento). Soglie fisse a 1 e 3 giorni di
 * ritardo, oltre non si accumula altro.
 * @param {number} difficulty - Difficoltà (1-5)
 * @param {number} delayDays - Giorni di ritardo
 * @param {number} [scoringBase=10] - Moltiplicatore base
 * @returns {number} Punti da sottrarre (0 se la soglia non è 1 o 3)
 */
export function calculateOverduePenalty(difficulty, delayDays, scoringBase = 10) {
  if (delayDays === 1) return 1;
  if (delayDays === 3) return difficulty * scoringBase;
  return 0;
}
