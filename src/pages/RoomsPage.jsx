import { useState, useEffect, useCallback } from 'react';
import { store } from '../store';
import PageHeader from '../components/PageHeader';
import CircularProgress from '../components/CircularProgress';
import { Plus, X, Pencil, Trash2, Home, Bath, ChefHat, Sofa, CheckSquare, BookOpen } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { clsx } from 'clsx';

const ROOM_ICONS = [
  { name: 'Home', icon: Home },
  { name: 'ChefHat', icon: ChefHat },
  { name: 'Bath', icon: Bath },
  { name: 'Sofa', icon: Sofa },
  { name: 'CheckSquare', icon: CheckSquare },
  { name: 'BookOpen', icon: BookOpen },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomForm, setRoomForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    const data = await store.getRooms().catch(() => []);
    setRooms(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleSave = async (data) => {
    if (roomForm?.id) {
      await store.updateRoom(roomForm.id, data);
    } else {
      await store.createRoom(data);
    }
    setRoomForm(null);
    fetchRooms();
  };

  const handleDelete = async (id) => {
    const res = await store.deleteRoom(id, false);
    if (res?.status === 'conflict') {
      const ok = window.confirm('Questa stanza ha task attivi. Eliminarli tutti?');
      if (ok) await store.deleteRoom(id, true);
    }
    setConfirmDelete(null);
    fetchRooms();
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
      <PageHeader title="Stanze" subtitle={`${rooms.length} stanze attive`} />

      {loading && <div className="text-center py-10 text-slate-400">Caricamento...</div>}

      {!loading && (
        <div className="space-y-3">
          {rooms.map(room => {
            const IconComp = LucideIcons[room.icon] || Home;
            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4"
              >
                <div className="p-3 bg-slate-50 rounded-xl text-slate-500 flex-shrink-0">
                  <IconComp className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800">{room.name}</h3>
                  <p className="text-xs text-slate-400">
                    {room.completion_percentage != null
                      ? `${Math.round(room.completion_percentage)}% in regola`
                      : 'Nessun task'}
                  </p>
                </div>

                <CircularProgress percentage={room.completion_percentage ?? 0} size={44} />

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setRoomForm(room)}
                    className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(room.id)}
                    className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {rooms.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              Nessuna stanza. Aggiungine una!
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setRoomForm({})}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus className="w-7 h-7" />
      </button>

      {roomForm !== null && (
        <RoomFormModal
          room={roomForm.id ? roomForm : null}
          onSave={handleSave}
          onClose={() => setRoomForm(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Eliminare questa stanza?"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function RoomFormModal({ room, onSave, onClose }) {
  const [name, setName] = useState(room?.name || '');
  const [icon, setIcon] = useState(room?.icon || 'Home');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), icon, sort_order: 0 });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black">{room ? 'Modifica Stanza' : 'Nuova Stanza'}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Es. Cucina"
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Icona</label>
            <div className="flex gap-2 flex-wrap">
              {ROOM_ICONS.map(({ name: iconName, icon: IconComp }) => (
                <button
                  key={iconName}
                  onClick={() => setIcon(iconName)}
                  className={clsx(
                    'p-3 rounded-xl transition-colors',
                    icon === iconName ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  <IconComp className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="w-full mt-6 py-3.5 bg-primary text-white font-bold rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : room ? 'Salva modifiche' : 'Crea stanza'}
        </button>
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
