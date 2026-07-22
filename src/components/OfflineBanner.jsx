import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-accent-danger text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      Siete offline. Alcune azioni sono disabilitate.
    </div>
  );
}