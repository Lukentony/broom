import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { User, Sparkles, Loader2 } from 'lucide-react';
import { store } from '../store';

export default function WhoAreYouModal({ onSelect }) {
  const [loading, setLoading] = useState(null);
  const [users, setUsers] = useState([]);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    store.getStats().then(data => {
      setUsers(data.leaderboard || []);
      setChecked(true);
    }).catch(() => {
      setUsers([]);
      setChecked(true);
    });
  }, []);

  const handleSelect = (id) => {
    setLoading(id);
    localStorage.setItem('broom_user_id', id.toString());
    setTimeout(() => {
      onSelect(id.toString());
    }, 400);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const user = await store.addUser(name.trim());
      await store.setCurrentUser(user.id);
      handleSelect(user.id);
    } catch (err) {
      setError('Errore durante la creazione del profilo. Riprova.');
      setCreating(false);
    }
  };

  const colors = [
    { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-primary', activeBg: 'bg-primary', activeBorder: 'border-primary' },
    { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', activeBg: 'bg-emerald-500', activeBorder: 'border-emerald-500' },
  ];

  // Prima del primo check store.getStats(), non mostrare nulla per evitare
  // un flash del form "crea profilo" quando in realtà utenti esistono già.
  if (!checked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        {users.length === 0 ? (
          <>
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Benvenuto in Broom!</h2>
              <p className="text-slate-500 font-medium">Inserisci il tuo nome per iniziare</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Il tuo nome"
                autoFocus
                disabled={creating}
                className="w-full border-2 border-slate-200 rounded-2xl px-4 py-4 text-base font-semibold focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
              />

              {error && (
                <p className="text-sm text-red-500 font-medium bg-red-50 p-3 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="w-full py-4 bg-primary text-white font-black text-lg rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creazione...
                  </span>
                ) : (
                  'Inizia!'
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User size={32} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Chi sei?</h2>
              <p className="text-slate-500 font-medium">Scegli il tuo profilo per iniziare</p>
            </div>

            <div className="grid gap-4">
              {users.map((user, idx) => {
                const c = colors[idx] || colors[0];
                const isActive = loading === user.user_id;
                return (
                  <button
                    key={user.user_id}
                    onClick={() => handleSelect(user.user_id)}
                    disabled={loading !== null}
                    className={clsx(
                      "relative overflow-hidden group p-6 rounded-3xl transition-all active:scale-95 flex flex-col items-center gap-2 border-2",
                      isActive ? `${c.activeBg} ${c.activeBorder} text-white` : `${c.bg} ${c.border} ${c.text}`
                    )}
                  >
                    <span className="text-2xl font-black">{user.user_name}</span>
                    <span className={clsx("text-[10px] font-bold uppercase tracking-widest opacity-60", isActive ? "text-white" : c.text)}>
                      Profilo {idx + 1}
                    </span>
                    {isActive && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          Broom Device Identity
        </p>
      </div>
    </div>
  );
}
