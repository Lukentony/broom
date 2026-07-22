import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { usePolling } from '../hooks/usePolling';
import { store } from '../store';
import { Trophy, ChevronRight } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import RoomCard from '../components/RoomCard';
import CompletionSheet from '../components/CompletionSheet';
import VacationBanner from '../components/VacationBanner';
import PageHeader from '../components/PageHeader';

export default function Dashboard() {
  const { tasks, loading, refetch } = useTasks();
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [widgetsOrder, setWidgetsOrder] = useState(['leaderboard', 'urgent', 'rooms']);
  const [widgetsHidden, setWidgetsHidden] = useState([]);
  const navigate = useNavigate();

  usePolling(refetch);

  useEffect(() => {
    store.getRooms().then(setRooms).catch(() => setRooms([]));
    store.getStats().then(setStats).catch(() => setStats({ leaderboard: [] }));
    store.getWidgets().then(data => {
      if (data.widgets_order) setWidgetsOrder(data.widgets_order.split(','));
      if (data.widgets_hidden) setWidgetsHidden(data.widgets_hidden.split(','));
    }).catch(() => {
      setWidgetsOrder(['leaderboard', 'urgent', 'rooms']);
      setWidgetsHidden([]);
    });
  }, []);

  const roomMap = Object.fromEntries(rooms.map(r => [r.id, r.name]));

  const handleCompleteRequest = (task) => {
    const today = new Date().toISOString().split('T')[0];
    if (task.next_due_date < today) {
      setSelectedTask(task);
    } else {
      handleConfirmComplete(task.id, true);
    }
  };

  const handleConfirmComplete = async (taskId, theoretical) => {
    await store.completeTask(taskId, theoretical);
    setSelectedTask(null);
    refetch();
    store.getRooms().then(setRooms).catch(() => {});
    store.getStats().then(setStats).catch(() => {}); // Refresh stats too
  };

  const urgentCount = tasks.filter(t => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    return t.next_due_date <= tomorrow;
  }).length;

  const renderWidget = (widget) => {
    if (widgetsHidden.includes(widget)) return null;
    
    switch (widget) {
      case 'leaderboard':
        const winner = stats?.leaderboard?.reduce((prev, current) => (prev.weekly_points > current.weekly_points) ? prev : current, stats.leaderboard[0]);
        const isTie = stats?.leaderboard?.length > 1 && stats.leaderboard.every(u => u.weekly_points === stats.leaderboard[0].weekly_points);

        return (
          <Link key="leaderboard" to="/score" className="block">
            <div className="bg-gradient-to-br from-primary to-blue-700 p-5 rounded-[2.5rem] text-white shadow-lg shadow-primary/20 flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md text-yellow-300">
                  <Trophy size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-tight tracking-tight">Punteggi</h3>
                  <p className="text-xs text-blue-100 font-medium opacity-80">
                    {!stats ? 'Caricamento...' : 
                     isTie ? 'Pareggio questa settimana! ⚔️' : 
                     `${winner?.user_name} è in testa! 🏆`}
                  </p>
                </div>
              </div>
              <ChevronRight className="text-white/40 group-hover:text-white transition-colors" />
            </div>
          </Link>
        );
      
      case 'urgent':
        return (
          <div key="urgent" className="space-y-3">
            <h3 className="font-bold text-slate-800 text-lg px-1 pt-2">Task Urgenti</h3>
            {loading ? <div className="text-center py-10 text-slate-400">Caricamento...</div> :
             tasks.length === 0 ? <EmptyState text="Nessun task in scadenza. Ottimo! ✨" /> :
             tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                roomName={roomMap[task.room_id]}
                onComplete={() => handleCompleteRequest(task)}
                onEdit={() => navigate('/tasks')}
              />
            ))}
          </div>
        );
        
      case 'rooms':
        return (
          <div key="rooms" className="space-y-3">
            <h3 className="font-bold text-slate-800 text-lg px-1 pt-2">Stanze</h3>
            {loading ? <div className="text-center py-10 text-slate-400">Caricamento...</div> :
             rooms.length === 0 ? <EmptyState text="Nessuna stanza configurata." /> :
             rooms.map(room => <RoomCard key={room.id} room={room} />)}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 pb-8">
      <PageHeader
        title="Broom"
        subtitle={urgentCount > 0 ? `${urgentCount} task urgenti` : 'Tutto in ordine ✨'}
      />

      <VacationBanner />

      {widgetsOrder.map(renderWidget)}

      {selectedTask && (
        <CompletionSheet
          task={selectedTask}
          onConfirm={(theoretical) => handleConfirmComplete(selectedTask.id, theoretical)}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="text-center py-12 text-slate-400">{text}</div>;
}
