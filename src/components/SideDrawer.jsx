import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, LayoutGrid, Calendar, History, Settings, X, Trophy } from 'lucide-react';
import { useDrawer } from '../contexts/DrawerContext';
import pkg from '../../package.json';

const NAV_ITEMS = [
  { path: '/',          icon: Home,        label: 'Home' },
  { path: '/tasks',     icon: CheckSquare, label: 'Task' },
  { path: '/rooms',     icon: LayoutGrid,  label: 'Stanze' },
  { path: '/calendar',  icon: Calendar,    label: 'Calendario' },
  { path: '/score',     icon: Trophy,      label: 'Punteggi' },
  { path: '/storico',   icon: History,     label: 'Storico' },
  { path: '/settings',  icon: Settings,    label: 'Impostazioni' },
];

export default function SideDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeDrawer}
      />

      {/* Panel */}
      <div className="relative bg-white w-72 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        {/* Header drawer */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-black text-xl text-slate-900">Broom</h2>
            <p className="text-xs text-slate-400">Gestione domestica</p>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 bg-slate-100 rounded-xl text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => { navigate(path); closeDrawer(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-left ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                <span className="font-bold text-sm">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter text-center">
            Broom v{pkg.version}
          </p>
        </div>
      </div>
    </div>
  );
}
