import { History, CalendarCheck2, X } from 'lucide-react';

export default function CompletionSheet({ task, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-t-[32px] p-8 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Quando l'hai fatto?</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
        </div>
        
        <p className="text-slate-500 mb-8 leading-relaxed">
          Il task per <strong>{task.name}</strong> è scaduto. 
          Scegli come vuoi ricalcolare la prossima scadenza:
        </p>

        <div className="grid gap-4">
          <button 
            onClick={() => onConfirm(true)}
            className="flex items-center gap-4 p-4 rounded-2xl border-2 border-primary bg-primary/5 text-left group"
          >
            <div className="p-3 bg-primary text-white rounded-xl"><History className="w-6 h-6" /></div>
            <div>
              <div className="font-bold text-primary">Data Teorica</div>
              <div className="text-xs text-slate-500 italic">Mantiene il ritmo originale (Recupero)</div>
            </div>
          </button>

          <button 
            onClick={() => onConfirm(false)}
            className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-200 text-left"
          >
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><CalendarCheck2 className="w-6 h-6" /></div>
            <div>
              <div className="font-bold text-slate-800">Data Reale</div>
              <div className="text-xs text-slate-500 italic">Ricomincia da oggi (Reset ritmo)</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}