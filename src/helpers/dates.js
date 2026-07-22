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
