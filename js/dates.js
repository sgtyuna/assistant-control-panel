// Calendar helpers. Weeks run Sunday through Saturday.
export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function startOfWeek(d) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
export function endOfWeek(d) { const x = startOfWeek(d); x.setDate(x.getDate() + 7); return x; }
export function startOfMonth(d) { const x = startOfDay(d); x.setDate(1); return x; }
