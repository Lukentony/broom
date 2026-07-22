import * as Icons from 'lucide-react';
import CircularProgress from './CircularProgress';

export default function RoomCard({ room }) {
  const IconComponent = Icons[room.icon] || Icons.Home;

  return (
    <div className="bg-card p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-transform">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-50 text-slate-400 group-hover:text-primary group-hover:bg-primary/5 rounded-xl transition-colors">
          <IconComponent className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{room.name}</h3>
          <p className="text-xs text-slate-400">Tutti i task completi</p>
        </div>
      </div>
      <CircularProgress percentage={room.completion_percentage} size={50} />
    </div>
  );
}