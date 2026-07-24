import * as Icons from 'lucide-react';

export default function RoomCard({ room }) {
  const IconComponent = Icons[room.icon] || Icons.Home;

  return (
    <div className="bg-card p-4 rounded-2xl shadow-sm border border-hairline flex items-center gap-4 group active:scale-[0.98] transition-transform">
      <div className="p-3 bg-background-sunken text-ink3 group-hover:text-primary group-hover:bg-primary/5 rounded-xl transition-colors">
        <IconComponent className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-bold text-ink">{room.name}</h3>
        <p className="text-xs text-ink3">
          {room.task_count === 1 ? '1 task' : `${room.task_count ?? 0} task`}
        </p>
      </div>
    </div>
  );
}