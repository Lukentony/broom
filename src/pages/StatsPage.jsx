import { useState, useEffect } from 'react';
import { api } from '../api';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronRight, History } from 'lucide-react';
import LeaderboardWidget from '../components/LeaderboardWidget';

export default function StatsPage() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getHistory(30).then(setHistory);
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center px-2">
        <h1 className="text-2xl font-black">Statistiche</h1>
      </header>

      <LeaderboardWidget />

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <History className="w-5 h-5 text-slate-400" />
          <h2 className="font-bold text-slate-600 uppercase text-xs tracking-widest">Ultimi 30 Giorni</h2>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          {history.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm italic">Nessuna attività registrata.</div>
          ) : (
            history.map((item, idx) => (
              <div key={item.id} className={`p-4 flex items-center justify-between ${idx !== history.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-primary">
                    +{item.points_awarded}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.task_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {item.user_name} • {format(parseISO(item.completed_at), "d MMMM, HH:mm", { locale: it })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-200" />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}