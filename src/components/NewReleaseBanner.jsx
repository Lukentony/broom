import { Download, X } from 'lucide-react';

export default function NewReleaseBanner({ version, url, onDismiss }) {
  return (
    <div className="fixed top-4 left-4 right-4 z-[100] bg-ink text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-primary rounded-lg flex-shrink-0"><Download className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">Nuova versione disponibile</p>
          <p className="text-xs text-white/60">{version}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-white text-ink text-xs font-black rounded-xl hover:bg-background-sunken"
        >
          Scarica
        </a>
        <button onClick={onDismiss} className="p-1 text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
