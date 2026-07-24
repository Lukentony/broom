// Traduzione da Python: homesync-clean/backend/logic/scoring.py (26 righe)
// Funzione pura: calcola i punti per un completamento

/**
 * Calcola i punti assegnati per un task completato.
 * @param {number} difficulty - Livello di difficoltà (1-5)
 * @param {string} assignmentType - Tipo di assegnazione (TOGETHER, FIXED_A, ecc.)
 * @param {number} [daysOverdue=0] - Giorni di ritardo
 * @param {number} [baseMultiplier=10] - Moltiplicatore base punti
 * @param {boolean} [splitShared=true] - Se dividere i punti per task condivisi
 * @param {object} [opts]
 * @param {number} [opts.graceDays=0] - Giorni di tolleranza prima che il ritardo conti
 * @param {number} [opts.lateBonusPoints=1] - Punti fissi per ritardo lieve (esattamente 1 giorno oltre la tolleranza)
 * @param {boolean} [opts.lateNegativeEnabled=true] - Se il ritardo grave (oltre 1 giorno dopo la tolleranza) dà punti negativi (false = 0 punti, mai penalità)
 * @returns {{ points: number, isShared: boolean }}
 */
export function calculatePoints(
  difficulty,
  assignmentType,
  daysOverdue = 0,
  baseMultiplier = 10,
  splitShared = true,
  opts = {}
) {
  const { graceDays = 0, lateBonusPoints = 1, lateNegativeEnabled = true } = opts;
  const basePoints = difficulty * baseMultiplier;
  const effectiveOverdue = Math.max(0, daysOverdue - graceDays);
  let points;

  if (effectiveOverdue > 1) {
    points = lateNegativeEnabled ? -basePoints : 0;
  } else if (effectiveOverdue === 1) {
    points = lateBonusPoints;
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
 * questo punisce il *non* completamento). Due soglie configurabili: la
 * prima toglie un numero fisso di punti, la seconda toglie difficoltà ×
 * scoringBase (penalità piena, proporzionale come i punti guadagnati).
 * @param {number} difficulty - Difficoltà (1-5)
 * @param {number} delayDays - Giorni di ritardo (già al netto della tolleranza)
 * @param {number} [scoringBase=10] - Moltiplicatore base
 * @param {object} [opts]
 * @param {number} [opts.day1=1] - Giorni di ritardo per la prima soglia
 * @param {number} [opts.points1=1] - Punti tolti alla prima soglia
 * @param {number} [opts.day2=3] - Giorni di ritardo per la seconda soglia (penalità piena)
 * @returns {number} Punti da sottrarre (0 se delayDays non coincide con nessuna soglia)
 */
export function calculateOverduePenalty(difficulty, delayDays, scoringBase = 10, opts = {}) {
  const { day1 = 1, points1 = 1, day2 = 3 } = opts;
  if (delayDays === day1) return points1;
  if (delayDays === day2) return difficulty * scoringBase;
  return 0;
}
