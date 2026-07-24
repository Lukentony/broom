// Store locale basato su Automerge
// Sostituisce tutte le chiamate HTTP di api.js con operazioni locali
// Interfaccia identica (Promise-based) per minimizzare modifiche alle pagine

import * as A from '@automerge/automerge';
import { calculatePoints, calculateOverduePenalty } from './logic/scoring.js';
import { calculateNextDate, nextDueFromRecurrence } from './logic/scheduling.js';
import { determineNextPerformer } from './logic/assignment.js';
import { createStorageAdapter, STORAGE_KEYS } from './storage.js';
import { todayISO, nowISO } from './helpers/dates.js';
import { updateNotifications } from './services/notifications.js';

// === Persistenza ===
const STORAGE_KEY = 'broom_doc_v2';
const SETTINGS_KEY = 'broom_settings';

let _nativeAdapter = null;
let saveTimer = null;
function scheduleSave(doc) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const serialized = A.save(doc);
      const data = JSON.stringify(Array.from(serialized));
      localStorage.setItem(STORAGE_KEY, data);
      if (_nativeAdapter) {
        await _nativeAdapter.write(STORAGE_KEY, data);
      }
    } catch (e) {
      console.error('Save failed:', e);
    }
  }, 500);
}

// Pulizia timer su reload / unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (saveTimer) clearTimeout(saveTimer);
  });
}

function loadDoc() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      const bytes = new Uint8Array(arr);
      return A.load(bytes);
    }
  } catch (e) {
    console.warn('Load failed, using seed:', e);
  }
  return null;
}

// === Documento iniziale ===
function initDoc() {
  return A.from({
    users: [],
    rooms: [
      { id: 1, name: 'Cucina', icon: 'ChefHat', sort_order: 0, is_active: true },
      { id: 2, name: 'Bagno', icon: 'Bath', sort_order: 1, is_active: true },
      { id: 3, name: 'Soggiorno', icon: 'Sofa', sort_order: 2, is_active: true },
      { id: 4, name: 'Camera', icon: 'BedDouble', sort_order: 3, is_active: true },
    ],
    tasks: [],
    completions: [],
  });
}

// === Stato ===
let doc = loadDoc() || initDoc();
doc = A.change(doc, 'check-overdue-penalties', checkOverduePenalties);
scheduleSave(doc);

// === Helpers ===
let idCounter = Date.now();
function nextId() {
  idCounter++;
  return idCounter;
}

function completionId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// todayISO() e nowISO() sono in helpers/dates.js

function daysOverdue(task) {
  const today = new Date(todayISO());
  const due = new Date(task.next_due_date);
  const diff = Math.floor((today - due) / 86400000);
  return Math.max(0, diff);
}

function isCurrentWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Lunedì
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function getActiveUsers(d) {
  return d.users.filter(u => u.is_active !== false);
}

// Legacy: task salvati prima del passaggio a multi-stanza avevano `room_id`
// singolo invece di `room_ids`. Normalizza in lettura, mai in scrittura.
function getRoomIds(task) {
  if (Array.isArray(task.room_ids)) return task.room_ids;
  return task.room_id != null ? [task.room_id] : [];
}

function getUserAB(d) {
  const active = getActiveUsers(d);
  return { userAId: active[0]?.id ?? null, userBId: active[1]?.id ?? null };
}

function isVacationMode() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const settings = raw ? JSON.parse(raw) : {};
    return settings.vacation_mode === 'true';
  } catch {
    return false;
  }
}

// Giorni della settimana in cui non si vogliono task/notifiche (0=Domenica
// ..6=Sabato). Default: weekend libero (comportamento di prima, quando era
// cablato) finché l'utente non lo cambia esplicitamente in Impostazioni.
function getNoWorkDays() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const settings = raw ? JSON.parse(raw) : {};
    if (settings.no_work_days === undefined) return [0, 6];
    return settings.no_work_days.split(',').filter(s => s !== '').map(Number);
  } catch {
    return [0, 6];
  }
}

// Penalità automatica sui task lasciati scaduti senza completarli (mai
// tirati indietro se completati): soglie fisse a 1 e 3 giorni di ritardo,
// una volta sola per soglia per ciclo di scadenza (task.penalized_delays,
// resettato ogni volta che next_due_date cambia). A differenza del cron
// notturno dell'originale (server sempre acceso), qui il controllo gira
// alla prossima apertura dell'app — se un task supera 3gg senza che l'app
// venga aperta, alla riapertura vengono applicate comunque entrambe le
// soglie mancanti (non "perse" come sarebbe con un controllo che guarda
// solo il ritardo esatto di oggi).
function checkOverduePenalties(d) {
  if (isVacationMode()) return;
  const today = new Date();
  if (getNoWorkDays().includes(today.getDay())) return;

  const todayStr = todayISO();
  const { userAId, userBId } = getUserAB(d);
  const active = getActiveUsers(d);

  d.tasks.forEach(t => {
    if (t.is_active === false || t.is_quick_action) return;
    const due = new Date(t.next_due_date);
    const delayDays = Math.floor((new Date(todayStr) - due) / 86400000);
    if (delayDays < 1) return;

    const penalized = Array.isArray(t.penalized_delays) ? t.penalized_delays : [];
    if (!t.penalized_delays) t.penalized_delays = penalized;

    for (const threshold of [1, 3]) {
      if (delayDays < threshold || penalized.includes(threshold)) continue;
      const penalty = calculateOverduePenalty(t.difficulty, threshold);
      if (penalty <= 0) continue;

      let targets = [];
      if (t.assignment_type === 'TOGETHER') targets = active.map(u => u.id);
      else if (['FIXED_A', 'FIXED_B', 'ALTERNATING'].includes(t.assignment_type)) {
        const assigned = determineNextPerformer(t.assignment_type, t.last_performer_id, userAId, userBId);
        if (assigned != null) targets = [assigned];
      }
      // ANY: nessun responsabile singolo, nessuna penalità (come l'originale)

      for (const uid of targets) {
        d.completions.push({
          id: completionId(),
          task_id: t.id,
          user_id: uid,
          completed_at: nowISO(),
          points_awarded: -penalty,
          was_on_demand: false,
          was_automated: true,
          is_shared: t.assignment_type === 'TOGETHER',
          task_name: `${t.name} — penalità ritardo`,
          user_name: null,
        });
      }
      penalized.push(threshold);
    }
  });
}

// --- Mutazioni (ritornano il doc aggiornato) ---

function mutate(fn) {
  doc = A.change(doc, 'op', fn);
  scheduleSave(doc);
  notifyChange();
  return doc;
}

function notifyChange() {
  // Fire-and-forget: aggiorna le notifiche senza bloccare la mutazione
  updateNotifications(store, getNoWorkDays()).catch(err => {
    console.warn('Notification update failed:', err);
  });
}

// === Store API (Promise-based, come api.js) ===

export const store = {

  // --- Tasks ---

  getDueTasks() {
    const today = todayISO();
    const tasks = doc.tasks.filter(t => t.is_active !== false && t.next_due_date <= today);
    return Promise.resolve(tasks);
  },

  getTasks() {
    return Promise.resolve(doc.tasks.filter(t => t.is_active !== false));
  },

  createTask(data) {
    mutate(d => {
      const id = nextId();
      const assignmentType = data.assignment_type || 'ANY';
      const { userAId, userBId } = getUserAB(d);
      const roomIds = Array.isArray(data.room_ids)
        ? data.room_ids
        : (data.room_id != null ? [data.room_id] : []);
      const recurrenceDays = Array.isArray(data.recurrence_days) && data.recurrence_days.length > 0
        ? data.recurrence_days
        : null;
      const task = {
        id,
        room_ids: roomIds,
        name: data.name,
        frequency_days: data.frequency_days,
        recurrence_days: recurrenceDays,
        difficulty: data.difficulty,
        assignment_type: assignmentType,
        grace_period_days: data.grace_period_days || 0,
        // Se non specificata esplicitamente, la prima scadenza rispetta la
        // ricorrenza scelta invece di essere sempre "oggi" (frequency_days=0
        // → calculateNextDate non sposta la data, "una tantum" resta dovuto
        // subito; recurrence_days → prossimo giorno della settimana scelto;
        // altrimenti scivola oltre i giorni di riposo se serve).
        next_due_date: data.next_due_date || nextDueFromRecurrence(
          { frequency_days: data.frequency_days, recurrence_days: recurrenceDays },
          todayISO(),
          getNoWorkDays()
        ),
        is_active: true,
        is_quick_action: false,
        tags: data.tags || null,
        last_performer_id: null,
        next_performer_id: determineNextPerformer(assignmentType, null, userAId, userBId),
        penalized_delays: [],
        created_at: nowISO(),
      };
      d.tasks.push(task);
    });
    return Promise.resolve({ id: doc.tasks[doc.tasks.length - 1].id });
  },

  updateTask(id, data) {
    mutate(d => {
      const task = d.tasks.find(t => t.id === id);
      if (!task) return;
      if (data.name !== undefined) task.name = data.name;
      if (data.room_ids !== undefined) task.room_ids = data.room_ids;
      else if (data.room_id !== undefined) task.room_ids = [data.room_id];

      const recurrenceChanged = data.recurrence_days !== undefined
        && JSON.stringify(data.recurrence_days || null) !== JSON.stringify(task.recurrence_days || null);
      if (data.recurrence_days !== undefined) {
        task.recurrence_days = Array.isArray(data.recurrence_days) && data.recurrence_days.length > 0
          ? data.recurrence_days
          : null;
      }

      const freqChanged = data.frequency_days !== undefined && data.frequency_days !== task.frequency_days;
      if (data.frequency_days !== undefined) task.frequency_days = data.frequency_days;

      if (data.next_due_date !== undefined) {
        // Data di scadenza scelta esplicitamente dall'utente: vince su tutto.
        task.next_due_date = data.next_due_date;
        task.penalized_delays = [];
      } else if (freqChanged || recurrenceChanged) {
        // Cambiare la ricorrenza deve avere effetto subito, non solo dopo il
        // prossimo completamento — altrimenti sembra che non faccia nulla.
        task.next_due_date = nextDueFromRecurrence(task, todayISO(), getNoWorkDays());
        task.penalized_delays = [];
      }

      if (data.difficulty !== undefined) task.difficulty = data.difficulty;
      if (data.assignment_type !== undefined) task.assignment_type = data.assignment_type;
      if (data.tags !== undefined) task.tags = data.tags;
      if (data.grace_period_days !== undefined) task.grace_period_days = data.grace_period_days;
    });
    return Promise.resolve({ success: true });
  },

  deleteTask(id) {
    mutate(d => {
      const task = d.tasks.find(t => t.id === id);
      if (task) task.is_active = false;
    });
    return Promise.resolve({ success: true });
  },

  completeTask(id, theoretical) {
    const userId = parseInt(localStorage.getItem('broom_user_id')) || 0;
    const task = doc.tasks.find(t => t.id === id);
    if (!task) return Promise.reject({ status: 404, message: 'Task non trovato' });

    const overdue = daysOverdue(task);
    const { points, isShared } = calculatePoints(
      task.difficulty,
      task.assignment_type,
      overdue
    );

    mutate(d => {
      const t = d.tasks.find(x => x.id === id);
      if (!t) return;

      // Determina data base per il ricalcolo
      const completionDate = todayISO();
      let baseDate;
      if (theoretical) {
        // Data teorica: mantiene il ritmo dalla scadenza originale
        baseDate = t.next_due_date;
      } else {
        // Data reale: ricomincia da oggi
        baseDate = completionDate;
      }

      // Aggiungi completamento
      const completion = {
        id: completionId(),
        task_id: id,
        user_id: userId,
        completed_at: new Date(`${completionDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
        points_awarded: points,
        was_on_demand: false,
        was_automated: false,
        is_shared: isShared,
        task_name: t.name,
        user_name: null, // verrà riempito lato getHistory
      };
      d.completions.push(completion);

      // Ricalcola prossima scadenza
      t.next_due_date = nextDueFromRecurrence(t, baseDate, getNoWorkDays());
      t.penalized_delays = [];

      // Aggiorna ultimo esecutore e calcola a chi tocca il prossimo giro
      t.last_performer_id = userId;
      const { userAId, userBId } = getUserAB(d);
      t.next_performer_id = determineNextPerformer(t.assignment_type, userId, userAId, userBId);
    });

    return Promise.resolve({ points });
  },

  completeOnDemand(id) {
    return store.completeTask(id, false).then(res => {
      // Marca come on-demand nell'ultimo completamento aggiunto
      mutate(d => {
        const last = d.completions[d.completions.length - 1];
        if (last) last.was_on_demand = true;
      });
      return res;
    });
  },

  undoComplete(id) {
    mutate(d => {
      const task = d.tasks.find(t => t.id === id);
      if (!task) return;

      // Rimuove l'ultimo completamento per questo task
      const revIdx = [...d.completions].reverse().findIndex(c => c.task_id === id);
      if (revIdx === -1) return;

      const realIdx = d.completions.length - 1 - revIdx;
      d.completions.splice(realIdx, 1);

      // Ripristina next_due_date allo stato precedente l'ultimo completamento
      // Cerca un eventuale completamento precedente
      const prevRevIdx = [...d.completions].reverse().findIndex(c => c.task_id === id);
      if (prevRevIdx !== -1) {
        // C'era già un completamento: ricalcola da quello (simula completeTask)
        const prevRealIdx = d.completions.length - 1 - prevRevIdx;
        const prevDate = d.completions[prevRealIdx].completed_at.split('T')[0];
        task.next_due_date = nextDueFromRecurrence(task, prevDate);
      } else {
        // Nessun completamento precedente: inverte l'effetto dell'ultimo completamento
        task.next_due_date = calculateNextDate(task.next_due_date, -task.frequency_days);
      }
      task.penalized_delays = [];
    });
    return Promise.resolve({ success: true });
  },

  /** Rinvia un task di N giorni senza registrare un completamento */
  snoozeTask(id, days = 1) {
    mutate(d => {
      const task = d.tasks.find(t => t.id === id);
      if (!task) return;
      task.next_due_date = calculateNextDate(task.next_due_date, days);
      task.penalized_delays = [];
    });
    return Promise.resolve({ success: true });
  },

  resetTest() {
    // Locale: resetta tutte le scadenze a oggi
    mutate(d => {
      const today = todayISO();
      d.tasks.forEach(t => {
        if (t.is_active !== false) {
          t.next_due_date = today;
          t.penalized_delays = [];
        }
      });
    });
    return Promise.resolve({ success: true });
  },

  generateTestData() {
    // Locale: genera completamenti finti per gli ultimi 14 giorni
    const userId = parseInt(localStorage.getItem('broom_user_id')) || 0;
    const activeTasks = doc.tasks.filter(t => t.is_active !== false);
    if (activeTasks.length === 0) return Promise.resolve({ completions_created: 0 });

    let count = 0;
    mutate(d => {
      for (let day = 1; day <= 14; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        const dateStr = date.toISOString().split('T')[0];

        // Completa alcuni task casuali
        const eligible = d.tasks.filter(t => t.is_active !== false && t.next_due_date <= dateStr);
        for (const task of eligible.slice(0, Math.ceil(eligible.length / 3))) {
          const { points } = calculatePoints(task.difficulty, task.assignment_type, 0);
          d.completions.push({
            id: completionId(),
            task_id: task.id,
            user_id: userId,
            completed_at: new Date(`${dateStr}T10:00:00`).toISOString(),
            points_awarded: points,
            was_on_demand: false,
            was_automated: true,
            is_shared: task.assignment_type === 'TOGETHER',
            task_name: task.name,
            user_name: null,
          });
          count++;
          // Ricalcola scadenza
          task.next_due_date = nextDueFromRecurrence(task, dateStr);
        }
      }
    });
    return Promise.resolve({ completions_created: count });
  },

  // --- Rooms ---

  getRooms() {
    const rooms = doc.rooms
      .filter(r => r.is_active !== false)
      .map(r => {
        const roomTasks = doc.tasks.filter(t => getRoomIds(t).includes(r.id) && t.is_active !== false);
        return { ...r, task_count: roomTasks.length };
      });
    return Promise.resolve(rooms);
  },

  createRoom(data) {
    mutate(d => {
      const id = nextId();
      d.rooms.push({
        id,
        name: data.name,
        icon: data.icon || 'Home',
        sort_order: data.sort_order || 0,
        is_active: true,
      });
    });
    return Promise.resolve({ id: doc.rooms[doc.rooms.length - 1].id });
  },

  updateRoom(id, data) {
    mutate(d => {
      const room = d.rooms.find(r => r.id === id);
      if (!room) return;
      if (data.name !== undefined) room.name = data.name;
      if (data.icon !== undefined) room.icon = data.icon;
      if (data.sort_order !== undefined) room.sort_order = data.sort_order;
    });
    return Promise.resolve({ success: true });
  },

  deleteRoom(id, force = false) {
    const hasTasks = doc.tasks.some(t => getRoomIds(t).includes(id) && t.is_active !== false);
    if (hasTasks && !force) {
      return Promise.resolve({ status: 'conflict', message: 'Room has active tasks' });
    }
    mutate(d => {
      const room = d.rooms.find(r => r.id === id);
      if (room) room.is_active = false;
      if (force) {
        d.tasks.forEach(t => {
          const ids = getRoomIds(t);
          if (!ids.includes(id)) return;
          // Un task può appartenere a più stanze: rimuovi solo questa. Se
          // restava l'unica, il task perde tutte le stanze e va disattivato.
          const remaining = ids.filter(rid => rid !== id);
          t.room_ids = remaining;
          if (remaining.length === 0) t.is_active = false;
        });
      }
    });
    return Promise.resolve({ success: true });
  },

  // --- Stats ---

  getStats() {
    const users = getActiveUsers(doc);
    const leaderboard = users.map(u => {
      const userCompletions = doc.completions.filter(c => c.user_id === u.id);
      const weeklyPoints = userCompletions
        .filter(c => isCurrentWeek(c.completed_at))
        .reduce((sum, c) => sum + c.points_awarded, 0);
      const totalPoints = userCompletions
        .reduce((sum, c) => sum + c.points_awarded, 0);

      // Compatibilità con api.getStats() — campi espliciti, niente spread
      return {
        id: u.id,
        name: u.name,
        user_id: u.id,
        user_name: u.name,
        weekly_points: weeklyPoints,
        total_points: totalPoints,
        emoji: u.emoji,
        color: u.color,
      };
    });

    // Aggiungi anche gli utenti senza completamenti
    return Promise.resolve({ leaderboard });
  },

  getHistory(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const users = getActiveUsers(doc);
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    const history = doc.completions
      .filter(c => new Date(c.completed_at) >= cutoff)
      .map(c => ({
        id: c.id,
        task_name: c.task_name || doc.tasks.find(t => t.id === c.task_id)?.name || 'Task sconosciuto',
        user_name: c.user_name || userMap[c.user_id] || 'Utente sconosciuto',
        points_awarded: c.points_awarded,
        completed_at: c.completed_at,
        user_id: c.user_id,
        task_id: c.task_id,
      }))
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

    return Promise.resolve(history);
  },

  deleteHistoryItem(id) {
    mutate(d => {
      const idx = d.completions.findIndex(c => c.id === id);
      if (idx !== -1) d.completions.splice(idx, 1);
    });
    return Promise.resolve({ success: true });
  },

  // --- Settings ---

  getSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    let settings = {};
    try { settings = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }

    // Formato array di { key, value } per compatibilità con useSettings hook
    return Promise.resolve(
      Object.entries(settings).map(([key, value]) => ({ key, value }))
    );
  },

  getPreferences() {
    return store.getSettings();
  },

  patchPreferences(data) {
    return store.getSettings().then(current => {
      const currentObj = current.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
      const merged = { ...currentObj, ...data };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      return Promise.resolve({ success: true });
    });
  },

  getWidgets() {
    return store.getSettings().then(settings => {
      const obj = settings.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
      return Promise.resolve({
        widgets_order: obj.widgets_order || 'leaderboard,urgent',
        widgets_hidden: obj.widgets_hidden || '',
      });
    });
  },

  patchWidgets(data) {
    return store.patchPreferences(data);
  },

  getScoring() {
    return store.getSettings().then(settings => {
      const obj = settings.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
      return Promise.resolve({
        scoring_base: obj.scoring_base || '10',
        scoring_split_shared: obj.scoring_split_shared !== 'false' ? 'true' : 'false',
      });
    });
  },

  patchScoring(data) {
    return store.patchPreferences({
      scoring_base: String(data.base || 10),
      scoring_split_shared: data.split_shared !== false ? 'true' : 'false',
    });
  },

  renameUser(id, name) {
    mutate(d => {
      const user = d.users.find(u => u.id === id);
      if (user) user.name = name;
    });
    return Promise.resolve({ success: true });
  },

  toggleVacation(active) {
    return store.patchPreferences({ vacation_mode: active ? 'true' : 'false' });
  },

  verifySetup(userId, token) {
    // Locale: crea o recupera utente
    const uid = parseInt(userId);
    let user = doc.users.find(u => u.id === uid);
    if (!user) {
      mutate(d => {
        d.users.push({
          id: uid,
          name: `Utente ${d.users.length + 1}`,
          emoji: '🧑',
          color: '#E2743A',
          total_points: 0,
        });
      });
      user = doc.users[doc.users.length - 1];
    }
    return Promise.resolve({ user_name: user.name, user_id: user.id });
  },

  // --- Import/Export (per non dover reinserire i task a mano nei test) ---

  /** Esporta stanze e task attivi come oggetto serializzabile (JSON) */
  exportTasks() {
    const rooms = doc.rooms.filter(r => r.is_active !== false);
    const roomNameById = Object.fromEntries(rooms.map(r => [r.id, r.name]));
    const tasks = doc.tasks.filter(t => t.is_active !== false);
    return Promise.resolve({
      version: 1,
      exported_at: nowISO(),
      rooms: rooms.map(r => ({ name: r.name, icon: r.icon, sort_order: r.sort_order })),
      tasks: tasks.map(t => ({
        name: t.name,
        room_names: getRoomIds(t).map(id => roomNameById[id]).filter(Boolean),
        frequency_days: t.frequency_days,
        recurrence_days: t.recurrence_days || null,
        difficulty: t.difficulty,
        assignment_type: t.assignment_type,
        grace_period_days: t.grace_period_days,
        tags: t.tags,
        next_due_date: t.next_due_date,
      })),
    });
  },

  /**
   * Importa stanze e task da un oggetto nello stesso formato di
   * exportTasks(). Non distruttivo: le stanze sono abbinate per nome (case
   * insensitive) a quelle già esistenti, mai duplicate; i task vengono
   * sempre aggiunti come nuovi (turni/penalità ripartono da zero, gli id
   * utente originali non hanno senso su un documento diverso).
   */
  importTasks(data) {
    if (!data || !Array.isArray(data.tasks)) {
      return Promise.reject({ message: 'File non valido' });
    }
    let imported = 0;
    mutate(d => {
      const nameToId = {};
      d.rooms.filter(r => r.is_active !== false).forEach(r => {
        nameToId[r.name.toLowerCase()] = r.id;
      });

      (data.rooms || []).forEach(rd => {
        const key = (rd.name || '').toLowerCase();
        if (!key || nameToId[key]) return;
        const id = nextId();
        d.rooms.push({ id, name: rd.name, icon: rd.icon || 'Home', sort_order: rd.sort_order || 0, is_active: true });
        nameToId[key] = id;
      });

      data.tasks.forEach(td => {
        const roomIds = (td.room_names || [])
          .map(n => nameToId[(n || '').toLowerCase()])
          .filter(id => id !== undefined);
        if (!td.name || roomIds.length === 0) return;
        const id = nextId();
        d.tasks.push({
          id,
          room_ids: roomIds,
          name: td.name,
          frequency_days: td.frequency_days ?? 7,
          recurrence_days: Array.isArray(td.recurrence_days) && td.recurrence_days.length > 0 ? td.recurrence_days : null,
          difficulty: td.difficulty || 3,
          assignment_type: td.assignment_type || 'ANY',
          grace_period_days: td.grace_period_days || 0,
          next_due_date: td.next_due_date || todayISO(),
          is_active: true,
          is_quick_action: false,
          tags: td.tags || null,
          last_performer_id: null,
          next_performer_id: null,
          penalized_delays: [],
          created_at: nowISO(),
        });
        imported++;
      });
    });
    return Promise.resolve({ success: true, imported });
  },

  // --- Utility per integrazione ---

  /** Crea un nuovo utente locale (per setup) */
  addUser(name) {
    mutate(d => {
      const id = nextId();
      d.users.push({
        id,
        name,
        emoji: '🧑',
        color: '#E2743A',
        total_points: 0,
      });
    });
    const user = doc.users[doc.users.length - 1];
    return Promise.resolve(user);
  },

  /** Ottieni la lista utenti */
  getUsers() {
    return Promise.resolve(getActiveUsers(doc));
  },

  /** Imposta l'utente corrente */
  setCurrentUser(userId) {
    localStorage.setItem('broom_user_id', String(userId));
    return Promise.resolve({ success: true });
  },

  /** Inizializza storage nativo (Capacitor Filesystem) se disponibile */
  async initNativeStorage() {
    try {
      const adapter = await createStorageAdapter();
      if (adapter.isNative) {
        const raw = await adapter.read(STORAGE_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          const bytes = new Uint8Array(arr);
          const loaded = A.load(bytes);
          if (loaded) {
            doc = A.change(loaded, 'check-overdue-penalties', checkOverduePenalties);
            localStorage.setItem(STORAGE_KEY, raw);
          }
        }
        _nativeAdapter = adapter;
      }
    } catch (e) {
      console.warn('Native storage init failed:', e);
    }
    return Promise.resolve({ success: true });
  },

  /** Forza ricarica documento (per test) */
  _reload() {
    doc = loadDoc() || initDoc();
    return Promise.resolve(doc);
  },

  /** Solo per test: esegue subito il controllo penalità overdue */
  _checkOverduePenalties() {
    mutate(d => checkOverduePenalties(d));
    return Promise.resolve({ success: true });
  },
};

// === Export alias per retrocompatibilità ===
export default store;
