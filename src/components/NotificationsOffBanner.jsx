import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { checkPermissions, requestPermissions } from '../services/notifications';

// Il prompt al primo avvio (WhoAreYouModal) può essere rimandato o negato:
// questo banner resta come promemoria visibile finché le notifiche restano
// spente, invece di lasciarle sepolte solo dentro Impostazioni.
export default function NotificationsOffBanner() {
  const [status, setStatus] = useState('unknown');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    checkPermissions().then(setStatus).catch(() => {});
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    const granted = await requestPermissions().catch(() => false);
    setStatus(granted ? 'granted' : 'denied');
    setRequesting(false);
  };

  if (status === 'granted') return null;

  return (
    <div className="bg-background-sunken p-3 rounded-xl flex items-center gap-3 text-ink2 border border-hairline mb-4">
      <Bell className="w-5 h-5 flex-shrink-0 text-primary" />
      <div className="text-xs flex-1">
        <p className="font-bold uppercase tracking-tight">Notifiche spente</p>
        <p className="opacity-70 font-medium">Niente avviso quando tocca a te.</p>
      </div>
      <button
        onClick={handleEnable}
        disabled={requesting}
        className="text-xs font-black text-primary bg-primary/10 px-3 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex-shrink-0"
      >
        {requesting ? '...' : 'Attiva'}
      </button>
    </div>
  );
}
