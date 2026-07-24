// Funzioni helper per le date
// Shared: usate da store.js e notifications.js

/** Returns today's date in local timezone as YYYY-MM-DD */
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns current timestamp in ISO format */
export function nowISO() {
  return new Date().toISOString();
}

/** Giorni della settimana per selettori UI (value = Date.getDay(), 0=Domenica) */
export const WEEKDAYS_UI = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' },
];
