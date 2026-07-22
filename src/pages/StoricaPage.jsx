import { useState, useEffect } from 'react';
import { api } from '../api';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { CheckCircle2, Trash2, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';

export default function StoricaPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('tutti');

  const fetchHistory = () => {
    setLoading(true);
    api.getHistory(30)
      .then(data => {
        setHistory(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo completamento? i punti verranno stornati.')) return;
    await api.deleteHistoryItem(id);
    fetchHistory();
  };

  const uniqueUsers = [...new Set(history.map(h => h.user_name))];
  const filteredHistory = filterUser === 'tutti' ? history : history.filter(h => h.user_name === filterUser);

  const exportCSV = () => {
    const headers = ['Data', 'Task', 'Utente', 'Punti'];
    const rows = filteredHistory.map(item => [
      format(parseISO(item.completed_at), "yyyy-MM-dd HH:mm:ss"),
      `"${item.task_name.replace(/"/g, '""')}"`,
      `"${item.user_name.replace(/"/g, '""')}"`,
      item.points_awarded
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `storico_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <PageHeader title="Storico" subtitle="Ultimi 30 giorni" />
        <button 
          onClick={exportCSV} 
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"      
          title="Esporta CSV"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {history.length > 0 && (
        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterUser('tutti')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${     
              filterUser === 'tutti' ? 'bg-slate-800 text-white shadow-md shadow-slate-200' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            Tutti
          </button>
          {uniqueUsers.map(user => (
            <button
              key={user}
              onClick={() => setFilterUser(user)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${   
                filterUser === user ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {user}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="text-center py-10 text-slate-400">Caricamento...</div>}

      {!loading && history.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-400 font-medium">Nessun completamento trovato.</p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          {filteredHistory.map((item, idx) => (
            <div
              key={item.id}
              className={`p-4 flex items-center gap-3 ${idx !== filteredHistory.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                item.points_awarded > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'      
              }`}>
                {item.points_awarded}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{item.task_name}</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {item.user_name} · {format(parseISO(item.completed_at), "d MMM, HH:mm", { locale: it })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-slate-300 hover:text-red-400 transition-colors"
                title="Elimina completamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {filteredHistory.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nessuna attività per questo filtro.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
