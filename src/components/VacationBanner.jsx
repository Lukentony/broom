import { Plane, AlertTriangle } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export default function VacationBanner() {
  const { settings } = useSettings();

  if (settings.vacation_mode !== 'true') return null;

  return (
    <div className="bg-accent-vacation p-3 rounded-xl flex items-center gap-3 text-amber-900 border border-amber-200/50 mb-4 animate-pulse">
      <Plane className="w-5 h-5 flex-shrink-0" />
      <div className="text-xs">
        <p className="font-bold uppercase tracking-tight">Modalità Vacanza Attiva</p>
        <p className="opacity-80 font-medium">Le scadenze sono congelate. Godetevi il relax!</p>
      </div>
    </div>
  );
}