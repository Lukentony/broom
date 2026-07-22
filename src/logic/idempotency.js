// Traduzione da Python: homesync-clean/backend/logic/idempotency.py (13 righe)
// Funzione pura: genera chiave univoca per evitare doppi completamenti

const IDEMPOTENCY_WINDOW_SECONDS = 60;

/**
 * Genera una chiave univoca per idempotenza del completamento.
 * @param {number} taskId - ID del task
 * @param {number} userId - ID dell'utente
 * @param {string} assignmentType - Tipo di assegnazione
 * @returns {string} Chiave idempotente
 */
export function generateIdempotencyKey(taskId, userId, assignmentType) {
  // Arrotondamento intero del timestamp corrente sulla finestra temporale
  const timeSlot = Math.floor(Date.now() / 1000 / IDEMPOTENCY_WINDOW_SECONDS);

  if (assignmentType === 'TOGETHER') {
    return `together-${taskId}-${timeSlot}`;
  }

  return `task-${taskId}-user-${userId}-${timeSlot}`;
}
