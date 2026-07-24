import { differenceInCalendarDays, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { CheckCircle2, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { recurrenceLabel } from '../logic/scheduling.js';

function getUrgency(dueDate) {
  if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
  if (isToday(dueDate) || isTomorrow(dueDate)) return 'urgent';
  const days = differenceInCalendarDays(dueDate, new Date());
  if (days <= 3) return 'soon';
  return 'ok';
}

const URGENCY = {
  overdue: {
    card: 'border-overdue-soft bg-overdue-soft/40 border-l-overdue',
    badge: 'bg-overdue-soft text-overdue-ink',
    label: 'Scaduto',
  },
  urgent: {
    card: 'border-urgent-soft bg-urgent-soft/30 border-l-urgent',
    badge: 'bg-urgent-soft text-urgent-ink',
    label: 'Urgente',
  },
  soon: {
    card: 'border-soon-soft bg-soon-soft/30 border-l-soon',
    badge: 'bg-soon-soft text-soon-ink',
    label: 'In scadenza',
  },
  ok: {
    card: 'border-sage-soft border-l-sage',
    badge: 'bg-sage-soft text-sage-ink',
    label: 'OK',
  },
};

function daysLabel(dueDate) {
  if (isToday(dueDate)) return 'Oggi';
  if (isTomorrow(dueDate)) return 'Domani';
  if (isPast(dueDate)) {
    const d = differenceInCalendarDays(new Date(), dueDate);
    return `${d}g fa`;
  }
  const d = differenceInCalendarDays(dueDate, new Date());
  return `tra ${d}g`;
}

export default function TaskCard({ task, roomNames, performerName, onComplete, onEdit }) {
  const dueDate = parseISO(task.next_due_date);
  const urgency = getUrgency(dueDate);
  const s = URGENCY[urgency];
  const roomLabel = roomNames && roomNames.length > 0 ? roomNames.join(', ') : null;

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl shadow-sm border border-l-4 flex items-center justify-between overflow-hidden',
        s.card
      )}
      onClick={onEdit}
    >
      <div className="p-4 space-y-1 flex-1 min-w-0">
        <h3 className="font-bold text-ink truncate">{task.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase', s.badge)}>
            {s.label}
          </span>
          <span className="text-xs text-ink3 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysLabel(dueDate)}
          </span>
          {roomLabel && (
            <span className="text-xs text-ink3">· {roomLabel}</span>
          )}
          <span className="text-xs text-ink3">
            · {recurrenceLabel(task)} · {task.assignment_type === 'TOGETHER' ? 'Insieme' : task.assignment_type === 'FIXED_A' ? 'Fisso A' : task.assignment_type === 'FIXED_B' ? 'Fisso B' : task.assignment_type === 'ALTERNATING' ? 'Alternato' : 'Chiunque'}
          </span>
          {performerName && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-primary-soft text-primary-ink">
              Tocca a {performerName}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className="p-4 text-ink3 hover:text-primary active:scale-95 transition-all"
      >
        <CheckCircle2 className="w-7 h-7" />
      </button>
    </div>
  );
}
