// Turns the sample data file into a record with real dates. The file writes
// times as "days ago at a clock time" so the sample always looks recent.
import { startOfDay, startOfWeek, startOfMonth } from './dates.js';

function resolveWhen(when, within, now) {
  const [h, m] = (when.time || '12:00').split(':').map(Number);
  let d = startOfDay(now);
  d.setDate(d.getDate() - (when.daysAgo || 0));
  const floor = within === 'week' ? startOfWeek(now) : within === 'month' ? startOfMonth(now) : null;
  if (floor && d < floor) d = new Date(floor);
  d.setHours(h, m, 0, 0);
  return d;
}

// Early in the day some sample items are timed later than "now". Those are
// squeezed into the gap between the last item that has already happened today
// and now, keeping their order and spacing. Items already in the past keep
// their written times. Changes the dates in place.
export function fitBeforeNow(dates, now) {
  const late = dates.filter((d) => d > now);
  if (!late.length) return;
  const lo = Math.max(startOfDay(now).getTime(), ...dates.filter((d) => d <= now && d >= startOfDay(now)).map((d) => d.getTime()));
  const max = Math.max(...late.map((d) => d.getTime()));
  const scale = (now.getTime() - lo) / (max - lo + 60000);
  late.forEach((d) => d.setTime(lo + (d.getTime() - lo) * scale));
}

export function resolveDemo(raw, now = new Date()) {
  const inDays = (n) => new Date(now.getTime() + n * 86400000).toISOString();
  const { about, ...data } = raw;
  const rAt = raw.requests.map((r) => resolveWhen(r.when, null, now));
  const aAt = raw.actions.map((a) => resolveWhen(a.when, a.within, now));
  const nAt = (raw.alerts || []).map((n) => resolveWhen(n.when, null, now));
  fitBeforeNow([...rAt, ...aAt, ...nAt], now);
  return {
    ...data,
    settings: { homeScreen: null, pausedAll: false, quietHours: null, ...(raw.settings || {}) },
    assistants: raw.assistants.map((a) => ({
      ...a,
      access: (a.access || []).map(({ expiresInDays, ...rest }) =>
        expiresInDays == null ? rest : { ...rest, expiresAt: inDays(expiresInDays) }),
    })),
    requests: raw.requests.map(({ when, undoInHours, ...r }, i) => ({
      ...r, at: rAt[i].toISOString(), ...(undoInHours ? { undoHours: undoInHours } : {}),
    })),
    actions: raw.actions.map(({ when, within, undoInHours, ...a }, i) => ({
      status: 'done', ...a,
      at: aAt[i].toISOString(),
      ...(undoInHours ? { undoUntil: new Date(now.getTime() + undoInHours * 3600000).toISOString() } : {}),
    })),
    subscriptions: raw.subscriptions.map(({ nextInDays, ...s }) => ({ ...s, nextAt: inDays(nextInDays) })),
    alerts: (raw.alerts || []).map(({ when, ...n }, i) => ({ read: false, ...n, at: nAt[i].toISOString() })),
  };
}
