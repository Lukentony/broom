import { useState, useEffect } from 'react';
import { store } from '../store';
import PageHeader from '../components/PageHeader';
import { Trophy, History, Award, TrendingUp, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ScorePage() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, historyData] = await Promise.all([
          store.getStats(),
          store.getHistory(7)
        ]);
        setStats(statsData);
        setHistory(historyData);
      } catch (error) {
        console.error("Errore nel recupero dati score:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <PageHeader title="Punteggi" subtitle="Caricamento..." />
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-100 rounded-[2rem]"></div>
          <div className="h-32 bg-slate-100 rounded-[2rem]"></div>
        </div>
      </div>
    );
  }

  const leaderboard = stats?.leaderboard || [];
  const totalPointsSorted = [...leaderboard].sort((a, b) => b.total_points - a.total_points);
  const weeklyPointsSorted = [...leaderboard].sort((a, b) => b.weekly_points - a.weekly_points);

  const weeklyWinner = weeklyPointsSorted[0]?.weekly_points > weeklyPointsSorted[1]?.weekly_points 
    ? weeklyPointsSorted[0] 
    : null;
  
  const weeklyDiff = weeklyPointsSorted[0]?.weekly_points - (weeklyPointsSorted[1]?.weekly_points || 0);

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
      <PageHeader title="Punteggi" subtitle="Classifiche e attività" />

      {/* Classifica Settimanale */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Questa Settimana</h3>
        </div>
        
        <div className="bg-gradient-to-br from-primary to-blue-700 p-6 rounded-[2rem] text-white shadow-lg shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] opacity-10 rotate-12">
            <Trophy size={150} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-end">
              {weeklyPointsSorted.map((user, idx) => (
                <div key={user.user_id} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className={clsx(
                      "w-16 h-16 rounded-full flex items-center justify-center text-xl font-black border-4",
                      idx === 0 && weeklyWinner ? "bg-white text-primary border-yellow-400" : "bg-white/20 text-white border-white/10"
                    )}>
                      {user.user_name.charAt(0)}
                    </div>
                    {idx === 0 && weeklyWinner && (
                      <div className="absolute -top-2 -right-1 bg-yellow-400 p-1.5 rounded-full shadow-lg">
                        <Trophy size={14} className="text-primary-dark" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-tighter">{user.user_name}</p>
                    <p className="text-2xl font-black">{user.weekly_points}</p>
                  </div>
                </div>
              ))}
            </div>

            {weeklyWinner && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10">
                <p className="text-xs font-medium italic">
                  <span className="font-black not-italic">{weeklyWinner.user_name}</span> è in testa di {weeklyDiff} {weeklyDiff === 1 ? 'punto' : 'punti'}! 🚀
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Classifica Totale */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Award className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Punti Totali</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {totalPointsSorted.map((user, idx) => (
            <div key={user.user_id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-1">
              <div className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-1",
                idx === 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"
              )}>
                {user.user_name.charAt(0)}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.user_name}</p>
              <p className="text-xl font-black text-slate-800">{user.total_points}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Storia Recente */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Ultimi 7 giorni</h3>
        </div>

        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-400 font-medium italic">Nessuna attività recente</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 font-black text-[10px] border border-slate-100">
                    <span className="uppercase">{format(new Date(item.completed_at), 'eee', { locale: it })}</span>
                    <span className="text-sm leading-none">{format(new Date(item.completed_at), 'd')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{item.task_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Fatto da <span className="text-slate-600 font-bold">{item.user_name}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-xs font-black">
                    +{item.points_awarded}
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-active:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
