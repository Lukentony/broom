import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { User, Sparkles, Loader2, Bell, ArchiveRestore } from 'lucide-react';
import { store } from '../store';
import { requestPermissions } from '../services/notifications';

function formatBackupDate(mtime) {
  if (!mtime) return null;
  try {
    return new Date(mtime).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  } catch {
    return null;
  }
}

export default function WhoAreYouModal({ onSelect }) {
  const [loading, setLoading] = useState(null);
  const [users, setUsers] = useState([]);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Backup trovato su un'installazione pulita (Directory.Documents,
  // sopravvive alla disinstallazione) — proposto prima del form "crea
  // profilo". Vedi PIANO_BROOM_V1_10.md punto B.
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupDismissed, setBackupDismissed] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Step "notifiche" mostrato solo subito dopo aver creato il primissimo
  // profilo su questo device — non ha senso riproporlo scegliendo tra
  // profili già esistenti. Vedi PIANO_BROOM_V1_10.md punto D.
  const [step, setStep] = useState('main'); // 'main' | 'notif'
  const [pendingUserId, setPendingUserId] = useState(null);
  const [notifRequesting, setNotifRequesting] = useState(false);

  useEffect(() => {
    store.getStats().then(async data => {
      const list = data.leaderboard || [];
      setUsers(list);
      if (list.length === 0) {
        const info = await store.checkForBackup().catch(() => null);
        if (info) setBackupInfo(info);
      }
      setChecked(true);
    }).catch(() => {
      setUsers([]);
      setChecked(true);
    });
  }, []);

  const finishOnboarding = (id) => {
    setLoading(id);
    setTimeout(() => onSelect(id.toString()), 400);
  };

  const handleSelect = (id) => {
    localStorage.setItem('broom_user_id', id.toString());
    finishOnboarding(id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const user = await store.addUser(name.trim());
      await store.setCurrentUser(user.id);
      localStorage.setItem('broom_user_id', user.id.toString());
      setPendingUserId(user.id);
      setStep('notif');
    } catch (err) {
      setError('Errore durante la creazione del profilo. Riprova.');
      setCreating(false);
    }
  };

  const handleEnableNotifications = async () => {
    setNotifRequesting(true);
    await requestPermissions().catch(() => false);
    finishOnboarding(pendingUserId);
  };

  const handleSkipNotifications = () => {
    finishOnboarding(pendingUserId);
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await store.restoreFromBackup();
      const data = await store.getStats();
      setUsers(data.leaderboard || []);
    } catch {
      setError('Ripristino non riuscito. Riprova o crea un nuovo profilo.');
    }
    setBackupInfo(null);
    setRestoring(false);
  };

  const colors = [
    { bg: 'bg-primary-soft', border: 'border-primary-soft', text: 'text-primary', activeBg: 'bg-primary', activeBorder: 'border-primary' },
    { bg: 'bg-sage-soft', border: 'border-sage-soft', text: 'text-sage-ink', activeBg: 'bg-sage', activeBorder: 'border-sage' },
  ];

  // Prima del primo check store.getStats(), non mostrare nulla per evitare
  // un flash del form "crea profilo" quando in realtà utenti esistono già.
  if (!checked) return null;

  const showBackupPrompt = backupInfo && !backupDismissed;
  const showNotifStep = step === 'notif';
  const backupDate = formatBackupDate(backupInfo?.mtime);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-md" />

      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        {showBackupPrompt ? (
          <>
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ArchiveRestore size={32} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-display font-semibold text-ink tracking-tight">Trovato un backup</h2>
              <p className="text-ink2 font-medium">
                {backupDate ? `Del ${backupDate}: ` : ''}
                {backupInfo.usersCount} {backupInfo.usersCount === 1 ? 'utente' : 'utenti'} e{' '}
                {backupInfo.tasksCount} {backupInfo.tasksCount === 1 ? 'faccenda' : 'faccende'}. Vuoi ripristinarlo?
              </p>
            </div>

            {error && (
              <p className="text-sm text-urgent font-medium bg-urgent-soft p-3 rounded-xl mb-4">{error}</p>
            )}

            <div className="space-y-2">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="w-full py-4 bg-primary text-white font-black text-lg rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
              >
                {restoring ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Ripristino...
                  </span>
                ) : (
                  'Ripristina'
                )}
              </button>
              <button
                onClick={() => setBackupDismissed(true)}
                disabled={restoring}
                className="w-full py-3 text-ink2 bg-background-sunken font-bold text-sm rounded-2xl active:bg-background-sunken transition-colors disabled:opacity-50"
              >
                Ignora, crea un profilo nuovo
              </button>
            </div>
          </>
        ) : showNotifStep ? (
          <>
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell size={32} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-display font-semibold text-ink tracking-tight">Vuoi un avviso?</h2>
              <p className="text-ink2 font-medium">
                Un promemoria quando tocca a te e un riepilogo a fine giornata. Puoi disattivarlo quando vuoi da Impostazioni.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleEnableNotifications}
                disabled={notifRequesting}
                className="w-full py-4 bg-primary text-white font-black text-lg rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
              >
                {notifRequesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Attivazione...
                  </span>
                ) : (
                  'Attiva notifiche'
                )}
              </button>
              <button
                onClick={handleSkipNotifications}
                disabled={notifRequesting}
                className="w-full py-3 text-ink2 bg-background-sunken font-bold text-sm rounded-2xl active:bg-background-sunken transition-colors disabled:opacity-50"
              >
                Più tardi
              </button>
            </div>
          </>
        ) : users.length === 0 ? (
          <>
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-display font-semibold text-ink tracking-tight">Benvenuto in Broom!</h2>
              <p className="text-ink2 font-medium">Inserisci il tuo nome per iniziare</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Il tuo nome"
                autoFocus
                disabled={creating}
                className="w-full border-2 border-hairline rounded-2xl px-4 py-4 text-base font-semibold focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
              />

              {error && (
                <p className="text-sm text-urgent font-medium bg-urgent-soft p-3 rounded-xl">{error}</p>
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
              <h2 className="text-3xl font-display font-semibold text-ink tracking-tight">Chi sei?</h2>
              <p className="text-ink2 font-medium">Scegli il tuo profilo per iniziare</p>
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

        <p className="mt-8 text-center text-[10px] text-ink3 font-bold uppercase tracking-tighter">
          Broom Device Identity
        </p>
      </div>
    </div>
  );
}
