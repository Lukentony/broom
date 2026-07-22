import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Plane, FlaskConical, Settings, Layout, Users, Save, LogOut, ChevronRight, UserCircle, Award } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { api } from '../api';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const { settings, loading, toggleVacation, updateScoring, refetch } = useSettings();
  const [vacationLoading, setVacationLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [prefs, setPrefs] = useState({ show_urgency_colors: 'true', early_completion_days: '2', grace_period_days: '1' });
  const [widgets, setWidgets] = useState({ order: ['leaderboard', 'urgent', 'rooms'], hidden: [] });
  const [scoringBase, setScoringBase] = useState(10);
  const [scoringSplitShared, setScoringSplitShared] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingWidgets, setSavingWidgets] = useState(false);
  const [savingScoring, setSavingScoring] = useState(false);
  
  const [testMode, setTestMode] = useState(localStorage.getItem('broom_test_mode') === 'true');
  const currentUserId = localStorage.getItem('broom_user_id');
  const currentUser = users.find(u => u.user_id.toString() === currentUserId);

  useEffect(() => {
    api.getStats().then(data => setUsers(data.leaderboard || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      setPrefs({
        show_urgency_colors: settings.pref_show_urgency_colors || 'true',
        early_completion_days: settings.pref_early_completion_days || '2',
        grace_period_days: settings.pref_grace_period_days || '1'
      });
      setWidgets({
        order: (settings.widgets_order || 'leaderboard,urgent,rooms').split(','),
        hidden: (settings.widgets_hidden || '').split(',').filter(Boolean)
      });
      setScoringBase(parseInt(settings.scoring_base, 10) || 10);
      setScoringSplitShared(settings.scoring_split_shared !== 'false');
    }
  }, [settings, loading]);

  const handleSaveScoring = async () => {
    setSavingScoring(true);
    await updateScoring({
      base: scoringBase,
      split_shared: scoringSplitShared
    }).catch(() => {});
    setSavingScoring(false);
  };

  const handleLogout = () => {
    if (window.confirm('Vuoi cambiare utente? Dovrai scegliere di nuovo chi sei.')) {
      localStorage.removeItem('broom_user_id');
      window.location.reload();
    }
  };

  const handleToggleTestMode = (e) => {
    const val = e.target.checked;
    setTestMode(val);
    localStorage.setItem('broom_test_mode', val ? 'true' : 'false');
  };

  const handleGenerateTestData = async () => {
    if (!window.confirm('Generare dati di test per gli ultimi 14 giorni?')) return;
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await api.generateTestData();
      setGenerateResult(`Creati ${res.completions_created} completamenti di test ✨`);
    } catch (e) {
      setGenerateResult('Errore nella generazione ❌');
    }
    setGenerating(false);
  };

  const handleReset = async () => {
    if (!window.confirm('Reset completo: tutte le scadenze tornano a oggi, punti azzerati. Continuare?')) return;
    setResetting(true);
    await api.resetTest().catch(() => {});
    setResetting(false);
  };

  const handleVacationToggle = async () => {
    setVacationLoading(true);
    await toggleVacation(settings.vacation_mode !== 'true');
    setVacationLoading(false);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    await api.patchPreferences(prefs).catch(() => {});
    await refetch();
    setSavingPrefs(false);
  };

  const handleSaveWidgets = async () => {
    setSavingWidgets(true);
    await api.patchWidgets({
      widgets_order: widgets.order.join(','),
      widgets_hidden: widgets.hidden.join(',')
    }).catch(() => {});
    await refetch();
    setSavingWidgets(false);
  };

  const [userToRename, setUserToRename] = useState(null);

  const handleSaveRename = async (newName) => {
    if (newName && newName !== userToRename.user_name) {
      await api.renameUser(userToRename.user_id, newName).catch(() => {});
      api.getStats().then(data => setUsers(data.leaderboard || [])).catch(() => {});
    }
    setUserToRename(null);
  };

  const toggleWidgetHidden = (w) => {
    setWidgets(prev => {
      const hidden = prev.hidden.includes(w) ? prev.hidden.filter(x => x !== w) : [...prev.hidden, w];
      return { ...prev, hidden };
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
      <PageHeader title="Impostazioni" subtitle="Gestisci la casa" />

      {/* Account */}
      <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 tracking-tight">Il tuo Profilo</p>
            <p className="text-xs text-slate-400 font-medium">Device Identity</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-primary border border-slate-200">
              {currentUser?.user_name?.charAt(0) || '?'}
            </div>
            <span className="font-bold text-slate-700">{currentUser?.user_name || 'Caricamento...'}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-black text-red-500 bg-red-50 px-4 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <LogOut size={14} />
            Cambia
          </button>
        </div>
      </section>

      {/* Utenti */}
      <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Users className="w-5 h-5 text-indigo-500" />
          <p className="font-bold text-slate-800 text-sm uppercase tracking-wider">Gestione Nomi</p>
        </div>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.user_id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
              <span className="font-bold text-slate-700 text-sm">{u.user_name}</span>
              <button 
                onClick={() => setUserToRename(u)}
                className="text-xs text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Modifica
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Preferenze Visuali */}
      <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Settings className="w-5 h-5 text-sky-500" />
          <p className="font-bold text-slate-800 text-sm uppercase tracking-wider">Preferenze</p>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700">
            Colori urgenza
            <input 
              type="checkbox" 
              checked={prefs.show_urgency_colors === 'true'} 
              onChange={(e) => setPrefs(p => ({ ...p, show_urgency_colors: e.target.checked ? 'true' : 'false' }))}
              className="w-5 h-5 accent-primary rounded-lg"
            />
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Giorni anticipo</span>
            <input 
              type="number" 
              value={prefs.early_completion_days} 
              onChange={(e) => setPrefs(p => ({ ...p, early_completion_days: e.target.value }))}
              className="w-14 px-2 py-2 text-center bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
            />
          </div>
          <button 
            onClick={handleSavePrefs}
            disabled={savingPrefs}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {savingPrefs ? 'Salvataggio...' : 'Salva preferenze'}
          </button>
        </div>
      </section>

      {/* Regole Punteggio */}
      <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Award className="w-5 h-5 text-amber-500" />
          <p className="font-bold text-slate-800 text-sm uppercase tracking-wider">Regole Punteggio</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Moltiplicatore punti base</span>
            <input 
              type="number" 
              min={1}
              max={100}
              value={scoringBase} 
              onChange={(e) => setScoringBase(parseInt(e.target.value, 10) || 1)}
              className="w-16 px-2 py-2 text-center bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
            />
          </div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700">
            Dividi punti condivisi
            <input 
              type="checkbox" 
              checked={scoringSplitShared} 
              onChange={(e) => setScoringSplitShared(e.target.checked)}
              className="w-5 h-5 accent-primary rounded-lg"
            />
          </label>
          <button 
            onClick={handleSaveScoring}
            disabled={savingScoring}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {savingScoring ? 'Salvataggio...' : 'Salva regole'}
          </button>
        </div>
      </section>

      {/* Modalità Vacanza */}
      <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx("p-3 rounded-2xl", settings.vacation_mode === 'true' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400')}>
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 tracking-tight">Modalità Vacanza</p>
              <p className="text-[10px] text-slate-400 font-medium">Congela le scadenze</p>
            </div>
          </div>
          <button
            disabled={vacationLoading}
            onClick={handleVacationToggle}
            className={clsx("w-14 h-8 rounded-full transition-colors relative", settings.vacation_mode === 'true' ? 'bg-primary' : 'bg-slate-200')}
          >
            <div className={clsx("absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all", settings.vacation_mode === 'true' ? 'left-7' : 'left-1')} />
          </button>
        </div>
        {settings.vacation_mode === 'true' && (
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
            <p className="text-[10px] text-amber-700 font-bold leading-tight uppercase tracking-wider">Vacanza attiva</p>
            <p className="text-[10px] text-amber-600/80 font-medium mt-1">
              Al ritorno le scadenze verranno riprogrammate automaticamente.
            </p>
          </div>
        )}
      </section>

      {/* Widget Home */}
      <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Layout className="w-5 h-5 text-teal-500" />
          <p className="font-bold text-slate-800 text-sm uppercase tracking-wider">Widget Dashboard</p>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {['leaderboard', 'urgent', 'rooms'].map(w => (
            <button 
              key={w}
              onClick={() => toggleWidgetHidden(w)}
              className={clsx(
                "flex items-center justify-between p-3 rounded-2xl border transition-all text-sm font-bold capitalize",
                !widgets.hidden.includes(w) ? "bg-white border-slate-200 text-slate-700 shadow-sm" : "bg-slate-50 border-transparent text-slate-400"
              )}
            >
              {w === 'leaderboard' ? 'Punteggi' : w === 'urgent' ? 'Task Urgenti' : 'Stanze'}
              <div className={clsx("w-4 h-4 rounded-full border-2", !widgets.hidden.includes(w) ? "bg-primary border-primary" : "border-slate-300")} />
            </button>
          ))}
          <button 
            onClick={handleSaveWidgets}
            disabled={savingWidgets}
            className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest mt-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {savingWidgets ? 'Salvataggio...' : 'Salva Visibilità'}
          </button>
        </div>
      </section>

      {/* Test Mode Section */}
      <section className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-600">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 tracking-tight">Modalità Test</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Sviluppo & Debug</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={testMode} 
            onChange={handleToggleTestMode}
            className="w-6 h-6 accent-amber-500"
          />
        </div>

        {testMode && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={handleGenerateTestData}
              disabled={generating}
              className="w-full flex items-center justify-between p-4 bg-white border border-amber-200 rounded-2xl shadow-sm active:scale-[0.98] transition-all group"
            >
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">Genera dati finti</p>
                <p className="text-[10px] text-slate-400 font-medium italic">Simula 14 giorni di attività</p>
              </div>
              <ChevronRight className="text-amber-300 group-hover:text-amber-500 transition-colors" />
            </button>

            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-bold text-xs uppercase tracking-widest border border-red-100 active:bg-red-100 transition-colors"
            >
              {resetting ? 'Reset in corso...' : 'Reset Totale'}
            </button>

            {generateResult && (
              <div className="bg-amber-100 p-3 rounded-xl text-center">
                <p className="text-xs font-bold text-amber-800">{generateResult}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="text-center pt-8">
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-loose">
          Broom Ecosystem<br/>
          <span className="opacity-50">v2.1.0 • Stable Build</span>
        </p>
      </div>

      {userToRename && (
        <RenameModal 
          user={userToRename} 
          onSave={handleSaveRename} 
          onClose={() => setUserToRename(null)} 
        />
      )}
    </div>
  );
}

function RenameModal({ user, onSave, onClose }) {
  const [name, setName] = useState(user.user_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-xl font-black text-slate-900">Rinomina Utente</h2>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl">
            Annulla
          </button>
          <button onClick={() => onSave(name)} className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl">
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
