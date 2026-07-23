// Servizio notifiche locali tramite @capacitor/local-notifications
// Le notifiche vengono calcolate in base ai task in scadenza / completati

import { todayISO } from '../helpers/dates.js';

const NOTIFICATION_IDS = {
  MORNING: 1,
  EVENING: 2,
};

let _initialized = false;
let LocalNotifications = null;


function makeTime(hours, minutes) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  if (d <= new Date()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function morningDate() {
  return makeTime(8, 0);
}

function eveningDate() {
  return makeTime(20, 0);
}

/**
 * Tenta di caricare il plugin Capacitor local-notifications.
 * Restituisce true solo su piattaforma nativa (Android / iOS).
 * In ambiente non-nativo (browser, test) il dynamic import fallisce o
 * il plugin web esiste ma non è supportato, quindi restituisce false.
 */
async function ensureInit() {
  if (_initialized) return true;
  try {
    // Prima verifica se siamo su piattaforma nativa
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;

    const mod = await import('@capacitor/local-notifications');
    LocalNotifications = mod.LocalNotifications;
    _initialized = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Richiede i permessi per le notifiche locali.
 * @returns {Promise<boolean>} true se concessi
 */
export async function requestPermissions() {
  if (!(await ensureInit())) return false;
  const perm = await LocalNotifications.requestPermissions();
  return perm.display === 'granted';
}

/**
 * Controlla lo stato attuale dei permessi senza richiederli.
 * @returns {Promise<'granted'|'denied'|'unknown'>}
 */
export async function checkPermissions() {
  if (!(await ensureInit())) return 'unknown';
  try {
    const perm = await LocalNotifications.checkPermissions();
    return perm.display === 'granted' ? 'granted' : perm.display === 'denied' ? 'denied' : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Programma la notifica mattutina (8:00) con il numero di faccende in scadenza.
 * Se dueCount <= 0, cancella la notifica mattutina.
 */
export async function scheduleMorningReminder(dueCount) {
  if (!(await ensureInit())) return;

  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_IDS.MORNING }],
  });

  if (dueCount <= 0) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_IDS.MORNING,
        title: '🧹 Buongiorno! Faccende in sospeso',
        body:
          dueCount === 1
            ? 'Hai 1 faccenda da completare oggi.'
            : `Hai ${dueCount} faccende da completare oggi.`,
        schedule: { at: morningDate() },
        sound: 'default',
        actionTypeId: '',
        extra: { type: 'morning_reminder', count: dueCount },
      },
    ],
  });
}

/**
 * Programma la notifica serale (20:00) con il riepilogo della giornata.
 * Se completedCount <= 0, cancella la notifica serale.
 */
export async function scheduleEveningSummary(completedCount, pointsEarned) {
  if (!(await ensureInit())) return;

  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_IDS.EVENING }],
  });

  if (completedCount <= 0) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_IDS.EVENING,
        title: '🌟 Riepilogo giornata',
        body: `Oggi hai completato ${completedCount} faccende e guadagnato ${pointsEarned} punti!`,
        schedule: { at: eveningDate() },
        sound: 'default',
        actionTypeId: '',
        extra: { type: 'evening_summary', completed: completedCount, points: pointsEarned },
      },
    ],
  });
}

/** Cancella la notifica mattutina */
export async function cancelMorning() {
  if (!_initialized && !(await ensureInit())) return;
  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_IDS.MORNING }],
  });
}

/** Cancella la notifica serale */
export async function cancelEvening() {
  if (!_initialized && !(await ensureInit())) return;
  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_IDS.EVENING }],
  });
}

/** Cancella tutte le notifiche programmate */
export async function cancelAll() {
  if (!_initialized && !(await ensureInit())) return;
  await LocalNotifications.cancelAll();
}

/**
 * Aggiorna le notifiche in base ai task correnti.
 * Chiamata ogni volta che i task cambiano.
 *
 * @param {object} storeRef - Riferimento allo store per leggere task e completamenti
 */
export async function updateNotifications(storeRef) {
  if (!(await ensureInit())) return;

  const today = todayISO();

  // Mattina: task in scadenza oggi o già scaduti
  const tasks = await storeRef.getTasks();
  const dueTasks = tasks.filter((t) => t.next_due_date <= today);
  await scheduleMorningReminder(dueTasks.length);

  // Sera: completamenti di oggi
  const history = await storeRef.getHistory(1);
  const todayCompletions = history.filter((c) => {
    const cDate = c.completed_at ? c.completed_at.split('T')[0] : '';
    return cDate === today;
  });
  const completedCount = todayCompletions.length;
  const pointsEarned = todayCompletions.reduce(
    (sum, c) => sum + (c.points_awarded || 0),
    0
  );
  await scheduleEveningSummary(completedCount, pointsEarned);
}
