// Traduzione da Python: homesync-clean/backend/logic/scheduling.py (20 righe)
// Funzioni pure: calcolo date di scadenza

/**
 * Calcola la prossima data di scadenza sommando frequenza a una data base.
 * @param {string|Date} baseDate - Data di partenza (string ISO o Date)
 * @param {number} frequency - Frequenza in giorni
 * @returns {string} Data ISO (YYYY-MM-DD)
 */
export function calculateNextDate(baseDate, frequency) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + frequency);
  return date.toISOString().split('T')[0];
}

/**
 * Calcola la prossima scadenza di un task dalla data di completamento.
 * @param {object} task - Il task
 * @param {string} fromDate - Data ISO da cui calcolare (oggi o data teorica)
 * @returns {string} Data ISO (YYYY-MM-DD)
 */
export function nextDueFromRecurrence(task, fromDate) {
  return calculateNextDate(fromDate, task.frequency_days);
}

/**
 * Calcola lo shift da applicare alle scadenze dopo una vacanza.
 * @param {number} daysPassed - Giorni passati in vacanza
 * @returns {number} Giorni di shift (0 se nessuno)
 */
export function computeVacationShift(daysPassed) {
  return daysPassed > 0 ? daysPassed : 0;
}
