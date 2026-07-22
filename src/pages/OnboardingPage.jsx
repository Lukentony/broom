import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store';
import { User, Sparkles, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const user = await store.addUser(name.trim());
      await store.setCurrentUser(user.id);
      navigate('/');
    } catch (err) {
      setError('Errore durante la creazione del profilo. Riprova.');
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gradient-to-br from-primary/5 to-blue-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="w-20 h-20 bg-primary text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
          <Sparkles size={40} strokeWidth={1.5} />
        </div>

        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Benvenuto in Broom!</h1>
          <p className="text-slate-500 font-medium mt-2">Inserisci il tuo nome per iniziare</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Il tuo nome"
              autoFocus
              disabled={saving}
              className="w-full border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-base font-semibold focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium bg-red-50 p-3 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-4 bg-primary text-white font-black text-lg rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creazione...
              </span>
            ) : (
              'Inizia!'
            )}
          </button>
        </form>

        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest pt-4">
          Broom — Gestione Casa
        </p>
      </div>
    </div>
  );
}
