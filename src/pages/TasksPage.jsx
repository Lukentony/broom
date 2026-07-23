import { useState, useEffect, useCallback } from 'react';
import { store } from '../store';
import TaskCard from '../components/TaskCard';
import CompletionSheet from '../components/CompletionSheet';
import PageHeader from '../components/PageHeader';
import { Plus, X, Star } from 'lucide-react';
import { clsx } from 'clsx';

const FREQ_PRESETS = [
  { label: 'Mai', days: 0 },
  { label: 'Ogni giorno', days: 1 },
  { label: 'Ogni 2 giorni', days: 2 },
  { label: 'Settimanale', days: 7 },
  { label: '2 settimane', days: 14 },
  { label: 'Mensile', days: 30 },
];

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editTask, setEditTask] = useState(null); // null = closed, {} = new, {...} = edit
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [undoToast, setUndoToast] = useState(null); // { taskId, taskName, timer }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tasksData, roomsData, statsData] = await Promise.all([
      store.getTasks().catch(() => []),
      store.getRooms().catch(() => []),
      store.getStats().catch(() => ({ leaderboard: [] })),
    ]);
    setTasks(tasksData || []);
    setRooms(roomsData || []);
    setUsers(statsData?.leaderboard || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const roomMap = Object.fromEntries(rooms.map(r => [r.id, r.name]));
  const userMap = Object.fromEntries(users.map(u => [u.user_id, u.user_name]));

  const handleCompleteRequest = (task) => {
    const today = new Date().toISOString().split('T')[0];
    if (task.next_due_date < today) {
      setSelectedTask(task);
    } else {
      handleConfirmComplete(task.id, true);
    }
  };

  const handleConfirmComplete = async (taskId, theoretical) => {
    await store.completeTask(taskId, theoretical);
    setSelectedTask(null);
    fetchAll();
    const task = tasks.find(t => t.id === taskId);
    if (undoToast?.timer) clearTimeout(undoToast.timer);
    const timer = setTimeout(() => setUndoToast(null), 5000);
    setUndoToast({ taskId, taskName: task?.name || 'Task', timer });
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    clearTimeout(undoToast.timer);
    setUndoToast(null);
    await store.undoComplete(undoToast.taskId);
    fetchAll();
  };

  const handleSaveTask = async (data) => {
    if (editTask?.id) {
      await store.updateTask(editTask.id, data);
    } else {
      await store.createTask(data);
    }
    setEditTask(null);
    fetchAll();
  };

  const handleDeleteTask = async (id) => {
    await store.deleteTask(id);
    setConfirmDelete(null);
    fetchAll();
  };

  const filteredTasks = (() => {
    if (activeTab === 'urgent') {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      return tasks.filter(t => t.next_due_date <= tomorrow);
    }
    return tasks;
  })();

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
      <PageHeader title="Task" subtitle={`${tasks.length} task attivi`} />

      <div className="flex bg-slate-100 p-1 rounded-xl">
        <TabBtn label="Urgenti" active={activeTab === 'urgent'} onClick={() => setActiveTab('urgent')} />
        <TabBtn label="Tutti" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
      </div>

      {loading && <div className="text-center py-10 text-slate-400">Caricamento...</div>}

      {!loading && activeTab !== 'rooms' && (
        <div className="space-y-3">
          {filteredTasks.length === 0
            ? <div className="text-center py-12 text-slate-400">Nessun task in questa vista.</div>
            : filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                roomNames={(task.room_ids || []).map(id => roomMap[id]).filter(Boolean)}
                performerName={task.next_performer_id != null ? userMap[task.next_performer_id] : null}
                onComplete={() => handleCompleteRequest(task)}
                onEdit={() => setEditTask(task)}
              />
            ))
          }
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setEditTask({})}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus className="w-7 h-7" />
      </button>

      {selectedTask && (
        <CompletionSheet
          task={selectedTask}
          onConfirm={(theoretical) => handleConfirmComplete(selectedTask.id, theoretical)}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {editTask !== null && (
        <TaskForm
          task={editTask.id ? editTask : null}
          rooms={rooms}
          users={users}
          onSave={handleSaveTask}
          onDelete={editTask.id ? () => setConfirmDelete(editTask.id) : null}
          onClose={() => setEditTask(null)}
        />
      )}

      {undoToast && (
        <div className="fixed bottom-40 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium">
          <span className="truncate max-w-[160px]">✓ {undoToast.taskName}</span>
          <button onClick={handleUndo} className="text-primary font-bold whitespace-nowrap">Annulla</button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Eliminare questo task?"
          onConfirm={() => handleDeleteTask(confirmDelete)}
          onCancel={() => { setConfirmDelete(null); setEditTask(tasks.find(t => t.id === confirmDelete) || null); }}
        />
      )}
    </div>
  );
}

function TaskForm({ task, rooms, users, onSave, onDelete, onClose }) {
  const [name, setName] = useState(task?.name || '');
  const initialRoomIds = task?.room_ids || (task?.room_id != null ? [task.room_id] : []);
  const [roomIds, setRoomIds] = useState(initialRoomIds.length > 0 ? initialRoomIds : (rooms[0] ? [rooms[0].id] : []));
  const [freqDays, setFreqDays] = useState(task?.frequency_days !== undefined ? task.frequency_days : 7);
  const [customFreq, setCustomFreq] = useState(false);
  const [difficulty, setDifficulty] = useState(task?.difficulty || 3);
  const [assignment, setAssignment] = useState(task?.assignment_type || 'TOGETHER');
  const [tags, setTags] = useState(task?.tags || '');
  const [saving, setSaving] = useState(false);

  const userAName = users?.[0]?.user_name || 'Lu';
  const userBName = users?.[1]?.user_name || 'Luca';

  const assignmentOptions = [
    { value: 'ANY', label: 'Chiunque' },
    { value: 'ALTERNATING', label: 'Alternato' },
    { value: 'FIXED_A', label: `Fisso ${userAName}` },
    { value: 'FIXED_B', label: `Fisso ${userBName}` },
    { value: 'TOGETHER', label: 'Insieme' },
  ];

  const presetMatch = FREQ_PRESETS.find(p => p.days === freqDays);

  const handleFreqPreset = (days) => {
    setFreqDays(days);
    setCustomFreq(false);
  };

  const toggleRoom = (id) => {
    setRoomIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!name.trim() || roomIds.length === 0) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      room_ids: roomIds,
      frequency_days: Number(freqDays),
      difficulty: Number(difficulty),
      assignment_type: assignment,
      tags: tags.trim() || null,
      grace_period_days: 1,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black">{task ? 'Modifica Task' : 'Nuovo Task'}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Es. Lavare i piatti"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Stanze (una o più) */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Stanze</label>
            <div className="flex gap-2 flex-wrap">
              {rooms.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRoom(r.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                    roomIds.includes(r.id) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
            {roomIds.length === 0 && (
              <p className="text-xs text-red-500 mt-1.5">Scegli almeno una stanza</p>
            )}
          </div>

          {/* Frequenza */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Frequenza</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {FREQ_PRESETS.map(p => (
                <button
                  key={p.days}
                  onClick={() => handleFreqPreset(p.days)}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                    freqDays === p.days && !customFreq
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setCustomFreq(true)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                  customFreq ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                Personalizzato
              </button>
            </div>
            {customFreq && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Ogni</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={freqDays}
                  onChange={e => setFreqDays(e.target.value)}
                  className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                />
                <span className="text-sm text-slate-500">giorni</span>
              </div>
            )}
          </div>

          {/* Difficoltà */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Difficoltà
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setDifficulty(n)}>
                  <Star
                    className={clsx('w-7 h-7 transition-colors', n <= difficulty ? 'text-amber-400 fill-amber-400' : 'text-slate-200')}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Assegnazione */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Assegnazione</label>
            <div className="flex gap-2 flex-wrap">
              {assignmentOptions.map(o => (
                <button
                  key={o.value}
                  onClick={() => setAssignment(o.value)}
                  className={clsx(
                    'px-3 py-2 rounded-xl text-xs font-bold transition-colors',
                    assignment === o.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tag */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Tag (opzionale)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Es. cucina, pulizie, settimanale"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || roomIds.length === 0}
            className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : task ? 'Salva modifiche' : 'Crea task'}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-full py-3 text-red-500 font-bold text-sm rounded-2xl active:bg-red-50 transition-colors"
            >
              Elimina task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4">
        <p className="font-bold text-slate-800 text-center">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl">
            Annulla
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl">
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
        active ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
      }`}
    >
      {label}
    </button>
  );
}
