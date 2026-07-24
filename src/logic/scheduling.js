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
 * Trova il prossimo giorno della settimana tra quelli scelti, strettamente
 * dopo baseDate (mai lo stesso giorno).
 * @param {string|Date} baseDate - Data di partenza
 * @param {number[]} days - Giorni della settimana (0=Domenica..6=Sabato, come Date.getDay())
 * @returns {string} Data ISO (YYYY-MM-DD)
 */
export function nextDateForWeekdays(baseDate, days) {
  const date = new Date(baseDate);
  for (let i = 1; i <= 7; i++) {
    date.setDate(date.getDate() + 1);
    if (days.includes(date.getDay())) {
      return date.toISOString().split('T')[0];
    }
  }
  // Non dovrebbe mai succedere con days non vuoto, ma per sicurezza:
  return calculateNextDate(baseDate, 7);
}

/**
 * Calcola la prossima scadenza di un task dalla data di completamento.
 * Un task con `recurrence_days` (giorni della settimana specifici) ignora
 * `frequency_days` e usa quello; altrimenti ricorrenza a intervallo fisso.
 * @param {object} task - Il task
 * @param {string} fromDate - Data ISO da cui calcolare (oggi o data teorica)
 * @returns {string} Data ISO (YYYY-MM-DD)
 */
export function nextDueFromRecurrence(task, fromDate) {
  if (Array.isArray(task.recurrence_days) && task.recurrence_days.length > 0) {
    return nextDateForWeekdays(fromDate, task.recurrence_days);
  }
  return calculateNextDate(fromDate, task.frequency_days);
}

/**
 * Proietta le prossime occorrenze di un task ricorrente, per il calendario.
 * Funzione pura, non tocca lo store — usata solo per il rendering.
 * @param {object} task - Il task (con next_due_date, frequency_days o recurrence_days)
 * @param {object} [opts]
 * @param {string} [opts.maxDate] - Data ISO limite (default: oggi + 6 mesi)
 * @param {number} [opts.maxCount=30] - Numero massimo di occorrenze
 * @returns {string[]} Array di date ISO, inclusa la prima (next_due_date)
 */
export function expandOccurrences(task, opts = {}) {
  const maxCount = opts.maxCount ?? 30;
  let maxDate = opts.maxDate;
  if (!maxDate) {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    maxDate = d.toISOString().split('T')[0];
  }

  const dates = [];
  let cursor = task.next_due_date;
  if (!cursor || (task.frequency_days === 0 && !(task.recurrence_days?.length))) {
    // Una tantum: nessuna proiezione, solo la data attuale.
    return cursor ? [cursor] : [];
  }

  while (cursor <= maxDate && dates.length < maxCount) {
    dates.push(cursor);
    cursor = nextDueFromRecurrence(task, cursor);
  }
  return dates;
}

const WEEKDAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

/**
 * Etichetta leggibile della ricorrenza di un task, per UI (card, form).
 * @param {object} task
 * @returns {string}
 */
export function recurrenceLabel(task) {
  if (Array.isArray(task.recurrence_days) && task.recurrence_days.length > 0) {
    return [...task.recurrence_days].sort().map(d => WEEKDAY_ABBR[d]).join(', ');
  }
  return task.frequency_days === 0 ? 'una tantum' : `ogni ${task.frequency_days}g`;
}

/**
 * Calcola lo shift da applicare alle scadenze dopo una vacanza.
 * @param {number} daysPassed - Giorni passati in vacanza
 * @returns {number} Giorni di shift (0 se nessuno)
 */
export function computeVacationShift(daysPassed) {
  return daysPassed > 0 ? daysPassed : 0;
}
