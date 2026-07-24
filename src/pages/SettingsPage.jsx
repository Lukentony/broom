import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Plane, Settings, Layout, Users, LogOut, UserCircle, Award, Bell, UserPlus, CalendarOff, Download, Upload } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { store } from '../store';
import { requestPermissions, checkPermissions } from '../services/notifications';
import { WEEKDAYS_UI } from '../helpers/dates.js';
import { clsx } from 'clsx';
import pkg from '../../package.json';

export default function SettingsPage() {
  const { settings, loading, toggleVacation, updateScoring, refetch } = useSettings();
  const [vacationLoading, setVacationLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [prefs, setPrefs] = useState({ show_urgency_colors: 'true', early_completion_days: '2', grace_period_days: '1' });
  const [widgets, setWidgets] = useState({ order: ['leaderboard', 'urgent'], hidden: [] });
  const [scoringBase, setScoringBase] = useState(10);
  const [scoringSplitShared, setScoringSplitShared] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingWidgets, setSavingWidgets] = useState(false);
  const [savingScoring, setSavingScoring] = useState(false);

  const currentUserId = localStorage.getItem('broom_user_id');
  const currentUser = users.find(u => u.user_id.toString() === currentUserId);

  const [notifStatus, setNotifStatus] = useState('unknown'); // unknown | granted | denied
  const [notifRequesting, setNotifRequesting] = useState(false);

  const [addingUser, setAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [savingNewUser, setSavingNewUser] = useState(false);

  const [noWorkDays, setNoWorkDays] = useState([0, 6]);
  const [savingNoWorkDays, setSavingNoWorkDays] = useState(false);

  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    store.getStats().then(data => setUsers(data.leaderboard || [])).catch(() => {});
    checkPermissions().then(setNotifStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      setPrefs({
        show_urgency_colors: settings.pref_show_urgency_colors || 'true',
        early_completion_days: settings.pref_early_completion_days || '2',
        grace_period_days: settings.pref_grace_period_days || '1'
      });
      setWidgets({
        order: (settings.widgets_order || 'leaderboard,urgent').split(','),
        hidden: (settings.widgets_hidden || '').split(',').filter(Boolean)
      });
      setScoringBase(parseInt(settings.scoring_base, 10) || 10);
      setScoringSplitShared(settings.scoring_split_shared !== 'false');
      setNoWorkDays(
        settings.no_work_days === undefined
          ? [0, 6]
          : settings.no_work_days.split(',').filter(Boolean).map(Number)
      );
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

  const handleVacationToggle = async () => {
    setVacationLoading(true);
    await toggleVacation(settings.vacation_mode !== 'true');
    setVacationLoading(false);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    await store.patchPreferences(prefs).catch(() => {});
    await refetch();
    setSavingPrefs(false);
  };

  const handleSaveWidgets = async () => {
    setSavingWidgets(true);
    await store.patchWidgets({
      widgets_order: widgets.order.join(','),
      widgets_hidden: widgets.hidden.join(',')
    }).catch(() => {});
    await refetch();
    setSavingWidgets(false);
  };

  const handleRequestNotifications = async () => {
    setNotifRequesting(true);
    const granted = await requestPermissions().catch(() => false);
    setNotifStatus(granted ? 'granted' : 'denied');
    setNotifRequesting(false);
  };

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    setSavingNewUser(true);
    await store.addUser(newUserName.trim()).catch(() => {});
    setNewUserName('');
    setAddingUser(false);
    setSavingNewUser(false);
    store.getStats().then(data => setUsers(data.leaderboard || [])).catch(() => {});
  };

  const [userToRename, setUserToRename] = useState(null);

  const handleSaveRename = async (newName) => {
    if (newName && newName !== userToRename.user_name) {
      await store.renameUser(userToRename.user_id, newName).catch(() => {});
      store.getStats().then(data => setUsers(data.leaderboard || [])).catch(() => {});
    }
    setUserToRename(null);
  };

  const toggleNoWorkDay = async (d) => {
    const next = noWorkDays.includes(d) ? noWorkDays.filter(x => x !== d) : [...noWorkDays, d];
    setNoWorkDays(next);
    setSavingNoWorkDays(true);
    await store.patchPreferences({ no_work_days: next.join(',') }).catch(() => {});
    setSavingNoWorkDays(false);
  };

  const handleExportTasks = async () => {
    const data = await store.exportTasks();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `broom_task_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportTasks = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permette di re-importare lo stesso file
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await store.importTasks(data);
      setImportResult(`Importati ${res.imported} task ✨`);
    } catch (err) {
      setImportResult('File non valido ❌');
    }
    setImporting(false);
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
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-ink tracking-tight">Il tuo Profilo</p>
            <p className="text-xs text-ink3 font-medium">Device Identity</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-background-sunken p-4 rounded-2xl border border-hairline">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-primary border border-hairline">
              {currentUser?.user_name?.charAt(0) || '?'}
            </div>
            <span className="font-bold text-ink2">{currentUser?.user_name || 'Caricamento...'}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-black text-urgent bg-urgent-soft px-4 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <LogOut size={14} />
            Cambia
          </button>
        </div>
      </section>

      {/* Utenti */}
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Users className="w-5 h-5 text-primary" />
          <p className="font-bold text-ink text-sm uppercase tracking-wider">Gestione Nomi</p>
        </div>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.user_id} className="flex justify-between items-center p-3 hover:bg-background-sunken rounded-2xl transition-colors group">
              <span className="font-bold text-ink2 text-sm">{u.user_name}</span>
              <button
                onClick={() => setUserToRename(u)}
                className="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Modifica
              </button>
            </div>
          ))}
        </div>

        {addingUser ? (
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              placeholder="Nome nuovo utente"
              autoFocus
              disabled={savingNewUser}
              className="flex-1 border border-hairline rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleAddUser}
              disabled={savingNewUser || !newUserName.trim()}
              className="px-4 py-2.5 bg-primary text-white text-xs font-black rounded-xl disabled:opacity-50"
            >
              Salva
            </button>
            <button
              onClick={() => { setAddingUser(false); setNewUserName(''); }}
              className="px-3 py-2.5 bg-background-sunken text-ink2 text-xs font-black rounded-xl"
            >
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingUser(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-primary bg-primary-soft rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all"
          >
            <UserPlus size={14} />
            Aggiungi utente
          </button>
        )}
      </section>

      {/* Notifiche */}
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx('p-3 rounded-2xl', notifStatus === 'granted' ? 'bg-sage-soft text-sage-ink' : 'bg-background-sunken text-ink3')}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-ink tracking-tight">Notifiche</p>
              <p className="text-[10px] text-ink3 font-medium">
                {notifStatus === 'granted' ? 'Attive' : notifStatus === 'denied' ? 'Negate dal sistema' : 'Promemoria mattina/sera'}
              </p>
            </div>
          </div>
          {notifStatus !== 'granted' && (
            <button
              onClick={handleRequestNotifications}
              disabled={notifRequesting}
              className="text-xs font-black text-primary bg-primary/10 px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
            >
              {notifRequesting ? '...' : 'Attiva'}
            </button>
          )}
        </div>
        <p className="text-[10px] text-ink3 leading-relaxed">
          Due promemoria fissi: 8:00 (task in scadenza oggi) e 20:00 (riepilogo
          della giornata). Non arrivano nei "Giorni di riposo" scelti qui sotto.
        </p>
      </section>

      {/* Giorni di riposo */}
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-3">
        <div className="flex items-center gap-3 px-1">
          <CalendarOff className="w-5 h-5 text-urgent" />
          <p className="font-bold text-ink text-sm uppercase tracking-wider">Giorni di riposo</p>
        </div>
        <p className="text-[10px] text-ink3 leading-relaxed px-1">
          Nei giorni scelti: niente notifiche e le scadenze a intervallo fisso
          (es. "ogni 3 giorni") slittano al primo giorno libero successivo.
          I task con giorni della settimana specifici non vengono spostati.
        </p>
        <div className="flex gap-1.5 flex-wrap px-1">
          {WEEKDAYS_UI.map(w => (
            <button
              key={w.value}
              onClick={() => toggleNoWorkDay(w.value)}
              disabled={savingNoWorkDays}
              className={clsx(
                'w-11 py-1.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50',
                noWorkDays.includes(w.value) ? 'bg-urgent text-white' : 'bg-background-sunken text-ink2'
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </section>

      {/* Preferenze Visuali */}
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Settings className="w-5 h-5 text-primary" />
          <p className="font-bold text-ink text-sm uppercase tracking-wider">Preferenze</p>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between text-sm font-semibold text-ink2">
            Colori urgenza
            <input 
              type="checkbox" 
              checked={prefs.show_urgency_colors === 'true'} 
              onChange={(e) => setPrefs(p => ({ ...p, show_urgency_colors: e.target.checked ? 'true' : 'false' }))}
              className="w-5 h-5 accent-primary rounded-lg"
            />
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink2">Giorni anticipo</span>
            <input 
              type="number" 
              value={prefs.early_completion_days} 
              onChange={(e) => setPrefs(p => ({ ...p, early_completion_days: e.target.value }))}
              className="w-14 px-2 py-2 text-center bg-background-sunken border border-hairline rounded-xl outline-none font-bold text-sm"
            />
          </div>
          <button 
            onClick={handleSavePrefs}
            disabled={savingPrefs}
            className="w-full flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {savingPrefs ? 'Salvataggio...' : 'Salva preferenze'}
          </button>
        </div>
      </section>

      {/* Regole Punteggio */}
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Award className="w-5 h-5 text-soon" />
          <p className="font-bold text-ink text-sm uppercase tracking-wider">Regole Punteggio</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink2">Moltiplicatore punti base</span>
            <input 
              type="number" 
              min={1}
              max={100}
              value={scoringBase} 
              onChange={(e) => setScoringBase(parseInt(e.target.value, 10) || 1)}
              className="w-16 px-2 py-2 text-center bg-background-sunken border border-hairline rounded-xl outline-none font-bold text-sm"
            />
          </div>
          <label className="flex items-center justify-between text-sm font-semibold text-ink2">
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
            className="w-full flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {savingScoring ? 'Salvataggio...' : 'Salva regole'}
          </button>

          <div className="bg-background-sunken p-4 rounded-2xl space-y-2">
            <p className="text-[10px] font-bold text-ink3 uppercase tracking-widest">Come si calcolano</p>
            <ul className="text-xs text-ink2 space-y-1.5 leading-relaxed">
              <li>• In tempo: difficoltà × {scoringBase} (es. difficoltà 3 = {3 * scoringBase} punti)</li>
              <li>• Con 1 giorno di ritardo: solo +1 punto</li>
              <li>• Con più di 1 giorno di ritardo: punti negativi, -(difficoltà × {scoringBase})</li>
              {scoringSplitShared && (
                <li>• Task "Insieme": i punti sopra si dividono a metà tra i due</li>
              )}
              <li>• Task scaduto mai completato: penalità automatica -1 dopo 1 giorno, -(difficoltà × {scoringBase}) dopo 3 giorni (salta weekend/giorni di riposo/vacanza; solo per task con un responsabile — non "Chiunque")</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Modalità Vacanza */}
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx("p-3 rounded-2xl", settings.vacation_mode === 'true' ? 'bg-soon-soft text-soon-ink' : 'bg-background-sunken text-ink3')}>
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-ink tracking-tight">Modalità Vacanza</p>
              <p className="text-[10px] text-ink3 font-medium">Congela le scadenze</p>
            </div>
          </div>
          <button
            disabled={vacationLoading}
            onClick={handleVacationToggle}
            className={clsx("w-14 h-8 rounded-full transition-colors relative", settings.vacation_mode === 'true' ? 'bg-primary' : 'bg-background-sunken')}
          >
            <div className={clsx("absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all", settings.vacation_mode === 'true' ? 'left-7' : 'left-1')} />
          </button>
        </div>
        {settings.vacation_mode === 'true' && (
          <div className="bg-soon-soft p-3 rounded-2xl border border-soon-soft">
            <p className="text-[10px] text-soon-ink font-bold leading-tight uppercase tracking-wider">Vacanza attiva</p>
            <p className="text-[10px] text-soon-ink/80 font-medium mt-1">
              Al ritorno le scadenze verranno riprogrammate automaticamente.
            </p>
          </div>
        )}
      </section>

      {/* Widget Home */}
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Layout className="w-5 h-5 text-sage" />
          <p className="font-bold text-ink text-sm uppercase tracking-wider">Widget Dashboard</p>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {['leaderboard', 'urgent'].map(w => (
            <button
              key={w}
              onClick={() => toggleWidgetHidden(w)}
              className={clsx(
                "flex items-center justify-between p-3 rounded-2xl border transition-all text-sm font-bold capitalize",
                !widgets.hidden.includes(w) ? "bg-white border-hairline text-ink2 shadow-sm" : "bg-background-sunken border-transparent text-ink3"
              )}
            >
              {w === 'leaderboard' ? 'Punteggi' : 'Task Urgenti'}
              <div className={clsx("w-4 h-4 rounded-full border-2", !widgets.hidden.includes(w) ? "bg-primary border-primary" : "border-hairline")} />
            </button>
          ))}
          <button 
            onClick={handleSaveWidgets}
            disabled={savingWidgets}
            className="w-full py-3 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest mt-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {savingWidgets ? 'Salvataggio...' : 'Salva Visibilità'}
          </button>
        </div>
      </section>

      {/* Esporta/Importa Task */}
      <section className="bg-white p-5 rounded-[2rem] border border-hairline shadow-sm space-y-3">
        <div className="flex items-center gap-3 px-1">
          <Download className="w-5 h-5 text-primary" />
          <p className="font-bold text-ink text-sm uppercase tracking-wider">Stanze e Task</p>
        </div>
        <p className="text-[10px] text-ink3 leading-relaxed px-1">
          Esporta un file con stanze e task per non doverli reinserire a mano
          ogni volta. Importare non cancella mai nulla: le stanze già esistenti
          vengono riusate (per nome), i task vengono sempre aggiunti.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportTasks}
            className="flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all"
          >
            <Download size={14} />
            Esporta
          </button>
          <label className="flex items-center justify-center gap-2 py-3 bg-background-sunken text-ink2 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer">
            <Upload size={14} />
            {importing ? '...' : 'Importa'}
            <input type="file" accept="application/json" onChange={handleImportTasks} disabled={importing} className="hidden" />
          </label>
        </div>
        {importResult && (
          <div className="bg-primary-soft p-3 rounded-xl text-center">
            <p className="text-xs font-bold text-primary-ink">{importResult}</p>
          </div>
        )}
      </section>

      <div className="text-center pt-8">
        <p className="text-[10px] text-ink3 font-bold uppercase tracking-widest leading-loose">
          Broom Ecosystem<br/>
          <span className="opacity-50">v{pkg.version}</span>
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
        <h2 className="text-xl font-black text-ink">Rinomina Utente</h2>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)}
          className="w-full border border-hairline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-background-sunken text-ink2 font-bold rounded-2xl">
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
