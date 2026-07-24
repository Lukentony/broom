import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DrawerProvider } from './contexts/DrawerContext';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import RoomsPage from './pages/RoomsPage';
import CalendarPage from './pages/CalendarPage';
import StoricaPage from './pages/StoricaPage';
import SettingsPage from './pages/SettingsPage';
import ScorePage from './pages/ScorePage';
import OnboardingPage from './pages/OnboardingPage';
import WhoAreYouModal from './components/WhoAreYouModal';
import SideDrawer from './components/SideDrawer';
import BottomNav from './components/BottomNav';
import UpdateBanner from './components/UpdateBanner';
import NewReleaseBanner from './components/NewReleaseBanner';
import OfflineBanner from './components/OfflineBanner';
import useOnlineStatus from './hooks/useOnlineStatus';
import { store } from './store';
import { checkForUpdate } from './services/updateCheck';
import pkg from '../package.json';

const SCHEMA_VERSION = 'broom_schema_v2.1';

function AppLayout() {
  const location = useLocation();
  const isSetup = location.pathname === '/setup';

  return (
    <>
      <Routes>
        <Route path="/setup"      element={<OnboardingPage />} />
        <Route path="/"           element={<Dashboard />} />
        <Route path="/tasks"      element={<TasksPage />} />
        <Route path="/rooms"      element={<RoomsPage />} />
        <Route path="/calendar"   element={<CalendarPage />} />
        <Route path="/score"      element={<ScorePage />} />
        <Route path="/storico"    element={<StoricaPage />} />
        <Route path="/settings"   element={<SettingsPage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
      {!isSetup && <SideDrawer />}
      {!isSetup && <BottomNav />}
    </>
  );
}

export default function App() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [newRelease, setNewRelease] = useState(null);
  const [userId, setUserId] = useState(localStorage.getItem('broom_user_id'));
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Inizializza storage nativo (Capacitor Filesystem) dopo il mount
    store.initNativeStorage();

    // Controlla se c'è una release più recente su GitHub (al massimo 1
    // volta al giorno). Non scarica/installa nulla da sola, mostra solo
    // un avviso con il link alla pagina della release.
    checkForUpdate(pkg.version).then(setNewRelease).catch(() => {});

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    if (!localStorage.getItem(SCHEMA_VERSION)) {
      localStorage.setItem(SCHEMA_VERSION, 'true');
    }
  }, []);

  return (
    <BrowserRouter>
      <DrawerProvider>
        <div className="min-h-screen bg-background text-ink">
          {!isOnline && <OfflineBanner />}
          {showUpdate && <UpdateBanner onUpdate={() => window.location.reload()} />}
          {!showUpdate && newRelease && (
            <NewReleaseBanner
              version={newRelease.version}
              url={newRelease.url}
              onDismiss={() => setNewRelease(null)}
            />
          )}

          {!userId ? (
            <WhoAreYouModal onSelect={setUserId} />
          ) : (
            <AppLayout />
          )}
        </div>
      </DrawerProvider>
    </BrowserRouter>
  );
}
