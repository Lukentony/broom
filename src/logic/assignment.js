// Traduzione da Python: homesync-clean/backend/logic/assignment.py (23 righe)
// Funzione pura: determina il prossimo esecutore di un task

/**
 * Determina a chi tocca eseguire il prossimo turno di un task.
 * @param {string} assignmentType - Tipo di assegnazione
 * @param {number|null} lastPerformerId - ID dell'ultimo esecutore
 * @param {number} userAId - ID primo utente
 * @param {number} userBId - ID secondo utente
 * @param {number|null} [fixedUserId=null] - ID utente fisso (per FIXED_USER)
 * @returns {number|null} ID del prossimo esecutore o null (per TOGETHER/ANY)
 */
export function determineNextPerformer(
  assignmentType,
  lastPerformerId,
  userAId,
  userBId,
  fixedUserId = null
) {
  if (assignmentType === 'FIXED_A') return userAId;
  if (assignmentType === 'FIXED_B') return userBId;
  if (assignmentType === 'FIXED_USER') return fixedUserId;
  if (assignmentType === 'TOGETHER') return null;

  if (assignmentType === 'ALTERNATING') {
    // Se nessuno l'ha mai fatto, inizia l'utente A
    if (lastPerformerId == null) return userAId;
    // Alternanza pura tra i due ID
    return lastPerformerId === userAId ? userBId : userAId;
  }

  return null; // Per tipo ANY (chiunque)
}
