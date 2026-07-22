// Store locale basato su Automerge
// Sostituisce le chiamate HTTP di api.js con operazioni locali

import * as A from '@automerge/automerge'

// Shape dello stato iniziale
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
    settings: {},
    overrides: [],
  })
}

let doc = initDoc()
let currentUser = null

// --- Mutazioni ---
export function addTask(taskData) {
  doc = A.change(doc, 'add task', d => {
    const id = Date.now()
    d.tasks.push({
      id, room_id: taskData.room_id, name: taskData.name,
      frequency_days: taskData.frequency_days, difficulty: taskData.difficulty,
      assignment_type: taskData.assignment_type, grace_period_days: taskData.grace_period_days || 0,
      next_due_date: new Date().toISOString().split('T')[0],
      is_active: true, is_quick_action: false, tags: taskData.tags || null,
    })
  })
  return doc
}

export function completeTask(taskId, userId) {
  doc = A.change(doc, 'complete task', d => {
    const task = d.tasks.find(t => t.id === taskId)
    if (!task) return
    const completion = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      task_id: taskId, user_id: userId,
      completed_at: new Date().toISOString(),
      points_awarded: task.difficulty * 10,
      was_on_demand: false, was_automated: false
    }
    d.completions.push(completion)
    // Ricalcola prossima scadenza
    const due = new Date(task.next_due_date)
    due.setDate(due.getDate() + task.frequency_days)
    task.next_due_date = due.toISOString().split('T')[0]
  })
  return doc
}

export function addUser(name) {
  doc = A.change(doc, 'add user', d => {
    d.users.push({ id: Date.now(), name, emoji: '🧑', color: '#E2743A', total_points: 0 })
  })
  return doc
}

export function setCurrentUser(user) { currentUser = user }
export function getCurrentUser() { return currentUser }
export function getDoc() { return doc }
export function loadDoc(saved) { doc = saved || initDoc() }

// --- Query helpers ---
export function getTasks() { return doc.tasks.filter(t => t.is_active) }
export function getRooms() { return doc.rooms.filter(r => r.is_active) }
export function getCompletions() { return doc.completions }
export function getStats() {
  const users = doc.users.map(u => ({
    ...u,
    weekly_points: 0, total_points: 0
  }))
  return { leaderboard: users }
}

