import { RefreshCcw } from 'lucide-react';

export default function UpdateBanner({ onUpdate }) {
  return (
    <div className="fixed top-4 left-4 right-4 z-[100] bg-ink text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in fade-in zoom-in duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary rounded-lg"><RefreshCcw className="w-5 h-5 animate-spin-slow" /></div>
        <p className="text-sm font-bold">Aggiornamento disponibile!</p>
      </div>
      <button 
        onClick={onUpdate}
        className="px-4 py-2 bg-white text-ink text-xs font-black rounded-xl hover:bg-background-sunken"
      >
        AGGIORNA ORA
      </button>
    </div>
  );
}