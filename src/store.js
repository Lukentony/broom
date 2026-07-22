// Store locale basato su Automerge
// Sostituisce tutte le chiamate HTTP di api.js con operazioni locali
// Interfaccia identica (Promise-based) per minimizzare modifiche alle pagine

import * as A from '@automerge/automerge';
import { calculatePoints } from './logic/scoring.js';
import { calculateNextDate, nextDueFromRecurrence } from './logic/scheduling.js';
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

// --- Mutazioni (ritornano il doc aggiornato) ---

function mutate(fn) {
  doc = A.change(doc, 'op', fn);
  scheduleSave(doc);
  notifyChange();
  return doc;
}

function notifyChange() {
  // Fire-and-forget: aggiorna le notifiche senza bloccare la mutazione
  updateNotifications(store).catch(err => {
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
      const task = {
        id,
        room_id: data.room_id,
        name: data.name,
        frequency_days: data.frequency_days,
        difficulty: data.difficulty,
        assignment_type: data.assignment_type || 'ANY',
        grace_period_days: data.grace_period_days || 0,
        next_due_date: todayISO(),
        is_active: true,
        is_quick_action: false,
        tags: data.tags || null,
        last_performer_id: null,
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
      if (data.room_id !== undefined) task.room_id = data.room_id;
      if (data.frequency_days !== undefined) task.frequency_days = data.frequency_days;
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
      t.next_due_date = nextDueFromRecurrence(t, baseDate);

      // Aggiorna ultimo esecutore
      t.last_performer_id = userId;
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
        // Calcola percentuale completamento
        const roomTasks = doc.tasks.filter(t => t.room_id === r.id && t.is_active !== false);
        const completed = roomTasks.filter(t => t.next_due_date >= todayISO()); // aggiornato oggi o futuro = ok
        const completion_percentage = roomTasks.length > 0
          ? Math.round((completed.length / roomTasks.length) * 100)
          : null;
        return { ...r, completion_percentage };
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
    const hasTasks = doc.tasks.some(t => t.room_id === id && t.is_active !== false);
    if (hasTasks && !force) {
      return Promise.resolve({ status: 'conflict', message: 'Room has active tasks' });
    }
    mutate(d => {
      const room = d.rooms.find(r => r.id === id);
      if (room) room.is_active = false;
      if (force) {
        d.tasks.forEach(t => {
          if (t.room_id === id) t.is_active = false;
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
        widgets_order: obj.widgets_order || 'leaderboard,urgent,rooms',
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
            doc = loaded;
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
};

// === Export alias per retrocompatibilità ===
export default store;
