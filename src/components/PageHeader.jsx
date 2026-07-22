import { useNavigate } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import { useDrawer } from '../contexts/DrawerContext';

/**
 * Shared page header with hamburger menu and optional back button.
 * @param {string} title - Page title
 * @param {string} subtitle - Optional subtitle
 * @param {string} backTo - If provided, shows a back arrow navigating to this path
 */
export default function PageHeader({ title, subtitle, backTo }) {
  const { openDrawer } = useDrawer();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between pt-2 pb-1 gap-3">
      {backTo ? (
        <button
          onClick={() => navigate(backTo)}
          className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
      ) : <div className="w-10" />}

      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-black truncate">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>

      <button
        onClick={openDrawer}
        className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 flex-shrink-0"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>
    </header>
  );
}
