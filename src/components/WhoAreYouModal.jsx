import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { User } from 'lucide-react';
import { api } from '../api';

export default function WhoAreYouModal({ onSelect }) {
  const [loading, setLoading] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getStats().then(data => setUsers(data.leaderboard || [])).catch(() => {});
  }, []);

  const handleSelect = (id) => {
    setLoading(id);
    localStorage.setItem('broom_user_id', id.toString());
    setTimeout(() => {
      onSelect(id.toString());
    }, 400);
  };

  const colors = [
    { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-primary', activeBg: 'bg-primary', activeBorder: 'border-primary' },
    { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', activeBg: 'bg-emerald-500', activeBorder: 'border-emerald-500' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
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

        <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          Broom Device Identity
        </p>
      </div>
    </div>
  );
}
