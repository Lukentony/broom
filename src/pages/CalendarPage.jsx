import { useState, useEffect } from 'react';
import { parseISO, isSameDay, isToday, isPast, isTomorrow } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import { clsx } from 'clsx';

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function getDayColor(dueDate) {
  if (isPast(dueDate) && !isToday(dueDate)) return 'bg-purple-400';
  if (isToday(dueDate) || isTomorrow(dueDate)) return 'bg-red-400';
  const diff = Math.ceil((dueDate - new Date()) / 86400000);
  if (diff <= 3) return 'bg-yellow-400';
  return 'bg-green-400';
}

export default function CalendarPage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getTasks().catch(() => []),
      api.getRooms().catch(() => []),
    ]).then(([t, r]) => {
      setTasks(t || []);
      setRooms(r || []);
    });
  }, []);

  const roomMap = Object.fromEntries(rooms.map(r => [r.id, r.name]));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // weekday index (Mon=0)
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const calendarCells = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(new Date(year, month, d));

  const tasksForDay = (day) => tasks.filter(t => isSameDay(parseISO(t.next_due_date), day));

  const selectedTasks = selectedDay ? tasksForDay(selectedDay) : [];

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-8">
      <PageHeader title="Calendario" subtitle="Prossime scadenze" />

      {/* Navigazione mese */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1.5 bg-slate-100 rounded-xl active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="font-black text-slate-800">{MONTHS[month]} {year}</h2>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 bg-slate-100 rounded-xl active:scale-95 transition-transform"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Griglia */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        {/* Header giorni */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Celle giorni */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarCells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const dayTasks = tasksForDay(day);
            const isCurrentDay = isToday(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={clsx(
                  'relative flex flex-col items-center py-1.5 rounded-xl transition-colors',
                  isCurrentDay && 'bg-primary/10',
                  isSelected && 'bg-primary text-white ring-2 ring-primary',
                  !isCurrentDay && !isSelected && 'hover:bg-slate-50'
                )}
              >
                <span className={clsx(
                  'text-sm font-bold',
                  isSelected ? 'text-white' : isCurrentDay ? 'text-primary' : 'text-slate-700'
                )}>
                  {day.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayTasks.slice(0, 3).map((t, idx) => (
                      <div
                        key={idx}
                        className={clsx('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : getDayColor(parseISO(t.next_due_date)))}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-3 flex-wrap px-1">
        {[
          { color: 'bg-green-400', label: '>3 giorni' },
          { color: 'bg-yellow-400', label: '1-3 giorni' },
          { color: 'bg-red-400', label: 'Oggi/domani' },
          { color: 'bg-purple-400', label: 'Scaduto' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={clsx('w-2.5 h-2.5 rounded-full', color)} />
            <span className="text-[10px] text-slate-400 font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Task del giorno selezionato */}
      {selectedDay && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-800">
              {selectedDay.getDate()} {MONTHS[selectedDay.getMonth()]}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="p-1 bg-slate-100 rounded-lg">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {selectedTasks.length === 0
            ? <p className="text-sm text-slate-400 text-center py-4">Nessun task in scadenza.</p>
            : selectedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className={clsx('w-2 h-8 rounded-full flex-shrink-0', getDayColor(parseISO(task.next_due_date)))} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{task.name}</p>
                  {roomMap[task.room_id] && (
                    <p className="text-xs text-slate-400">{roomMap[task.room_id]}</p>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
