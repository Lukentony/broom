import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, Calendar, Trophy } from 'lucide-react';
import { clsx } from 'clsx';

const TABS = [
  { path: '/',         icon: Home,        label: 'Home' },
  { path: '/tasks',    icon: CheckSquare, label: 'Task' },
  { path: '/calendar', icon: Calendar,    label: 'Calendario' },
  { path: '/score',    icon: Trophy,      label: 'Punteggi' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 py-2.5 active:bg-slate-50 transition-colors"
            >
              <Icon
                className={clsx('w-5 h-5', active ? 'text-primary stroke-[2.5]' : 'text-slate-400 stroke-[1.5]')}
              />
              <span className={clsx('text-[10px] font-bold', active ? 'text-primary' : 'text-slate-400')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
