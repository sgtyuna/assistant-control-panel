// Turns the sample data file into a record with real dates. The file writes
// times as "days ago at a clock time" so the sample always looks recent.
import { startOfDay, startOfWeek, startOfMonth } from './dates.js';

function resolveWhen(when, within, now) {
  const [h, m] = (when.time || '12:00').split(':').map(Number);
  const at = (base) => { const x = new Date(base); x.setHours(h, m, 0, 0); return x; };
  const day = startOfDay(now);
  day.setDate(day.getDate() - (when.daysAgo || 0));
  let d = at(day);
  // A time later than now keeps its clock time and moves back a day.
  if (d > now) { day.setDate(day.getDate() - 1); d = at(day); }
  const floor = within === 'week' ? startOfWeek(now) : within === 'month' ? startOfMonth(now) : null;
  if (floor && d < floor) {
    d = at(floor);
    if (d > now) d = new Date(now.getTime() - (24 * 60 - (h * 60 + m)) * 1000); // keeps the written order
  }
  return d.toISOString();
}

export function resolveDemo(raw, now = new Date()) {
  const inDays = (n) => new Date(now.getTime() + n * 86400000).toISOString();
  const { about, ...data } = raw;
  return {
    ...data,
    settings: { homeScreen: null, pausedAll: false, quietHours: null, ...(raw.settings || {}) },
    assistants: raw.assistants.map((a) => ({
      ...a,
      access: (a.access || []).map(({ expiresInDays, ...rest }) =>
        expiresInDays == null ? rest : { ...rest, expiresAt: inDays(expiresInDays) }),
    })),
    requests: raw.requests.map(({ when, undoInHours, ...r }) => ({
      ...r, at: resolveWhen(when, null, now), ...(undoInHours ? { undoHours: undoInHours } : {}),
    })),
    actions: raw.actions.map(({ when, within, undoInHours, ...a }) => ({
      status: 'done', ...a,
      at: resolveWhen(when, within, now),
      ...(undoInHours ? { undoUntil: new Date(now.getTime() + undoInHours * 3600000).toISOString() } : {}),
    })),
    subscriptions: raw.subscriptions.map(({ nextInDays, ...s }) => ({ ...s, nextAt: inDays(nextInDays) })),
    alerts: (raw.alerts || []).map(({ when, ...n }) => ({ read: false, ...n, at: resolveWhen(when, null, now) })),
  };
}
