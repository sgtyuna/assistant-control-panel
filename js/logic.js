// The rules, worked out from the record. No screen code and no storage here,
// so this file can be reused as it is if the screens are rebuilt later.
import { startOfDay, startOfWeek, endOfWeek, startOfMonth } from './dates.js';

const norm = (s) => String(s || '').trim().toLowerCase();
const usd = (n) => '$' + (Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(2));

// Only actions that really happened and still stand count as spending.
// Said No, undone, blocked and stopped actions count against nothing.
export function counts(action) {
  return action.status === 'done' && Number(action.amount) > 0;
}

export function spentSince(data, assistantId, since, until = null) {
  return data.actions
    .filter((a) => (assistantId == null || a.assistantId === assistantId) && counts(a) &&
      new Date(a.at) >= since && (!until || new Date(a.at) < until))
    .reduce((sum, a) => sum + Number(a.amount), 0);
}

export function spending(data, assistant, now = new Date()) {
  const l = assistant.limits || {};
  const rows = [
    { key: 'day', label: 'today', word: 'daily', spent: spentSince(data, assistant.id, startOfDay(now)), limit: l.perDay },
    { key: 'week', label: 'this week', word: 'weekly', spent: spentSince(data, assistant.id, startOfWeek(now)), limit: l.perWeek },
    { key: 'month', label: 'this month', word: 'monthly', spent: spentSince(data, assistant.id, startOfMonth(now)), limit: l.perMonth },
  ];
  rows.forEach((r) => { r.ratio = r.limit > 0 ? r.spent / r.limit : 0; });
  return rows;
}

// Quiet hours: { on, from: "22:00", to: "06:30", days: [0-6] }.
// No days picked means every day. A "to" at or before "from" runs overnight.
// Returns when the quiet time ends, or null if it is not quiet now.
export function quietUntil(q, now = new Date()) {
  if (!q || q.on === false || !q.from || !q.to) return null;
  const [fh, fm] = q.from.split(':').map(Number);
  const [th, tm] = q.to.split(':').map(Number);
  const overnight = th * 60 + tm <= fh * 60 + fm;
  for (const back of [0, 1]) {
    const day = startOfDay(now);
    day.setDate(day.getDate() - back);
    if (q.days && q.days.length && !q.days.includes(day.getDay())) continue;
    const start = new Date(day); start.setHours(fh, fm, 0, 0);
    const end = new Date(day);
    if (overnight) end.setDate(end.getDate() + 1);
    end.setHours(th, tm, 0, 0);
    if (th === 23 && tm === 59) end.setMinutes(60); // "until 11:59 PM" means the whole day
    if (now >= start && now < end) return end;
  }
  return null;
}

// An assistant is quiet when either the all-assistants hours or its own say so.
export function quietEnd(data, assistant, now = new Date()) {
  const ends = [quietUntil(data.settings.quietHours, now), quietUntil(assistant.quietHours, now)].filter(Boolean);
  return ends.length ? new Date(Math.max(...ends)) : null;
}

// What state an assistant is in right now.
//   own: what it would be if Pause Everything were off (paused, quiet or on).
//   key: what it is in effect (removed, pausedAll, paused, quiet or on).
export function stateOf(data, assistant, now = new Date()) {
  if (assistant.removed) return { key: 'removed', own: 'removed', until: null };
  const until = quietEnd(data, assistant, now);
  const own = assistant.paused ? 'paused' : until ? 'quiet' : 'on';
  return { key: data.settings.pausedAll ? 'pausedAll' : own, own, until: own === 'quiet' ? until : null };
}

export function ruleText(rule) {
  if (rule.type === 'over') return `Ask me before anything over ${usd(rule.amount)}`;
  if (rule.type === 'newPerson') return 'Ask me before emailing someone new';
  if (rule.type === 'newStore') return 'Ask me before buying from or booking with a new store';
  return rule.text || '';
}

export function isTrusted(assistant, party) { return !!norm(party) && (assistant.trusted || []).some((t) => norm(t) === norm(party)); }
export function isBlocked(assistant, party) { return !!norm(party) && (assistant.blocked || []).some((t) => norm(t) === norm(party)); }

function usedBefore(data, assistant, party) {
  return data.actions.some((a) => a.assistantId === assistant.id && a.status === 'done' && norm(a.party) === norm(party));
}

// Decide what happens to one thing an assistant wants to do.
// Order: blocked, then paused, then approve-first, then trusted.
// Going over a spending limit counts as approve-first.
// Returns { outcome: 'blocked' | 'paused' | 'ask' | 'allowed', why }.
export function decide(data, assistant, draft, now = new Date()) {
  if (isBlocked(assistant, draft.party)) {
    return { outcome: 'blocked', why: `${draft.party} is on the blocked list for ${assistant.name}.` };
  }
  const state = stateOf(data, assistant, now);
  if (state.key !== 'on') {
    const why = state.key === 'pausedAll' ? 'Everything is paused.'
      : state.key === 'paused' ? `${assistant.name} is paused.`
      : state.key === 'quiet' ? `${assistant.name} is in quiet hours.`
      : `${assistant.name} was removed.`;
    return { outcome: 'paused', why };
  }

  const amount = Number(draft.amount) || 0;
  const reasons = [];
  if (amount > 0) {
    const l = assistant.limits || {};
    if (l.perPurchase > 0 && amount > l.perPurchase) reasons.push(`It is over the ${usd(l.perPurchase)} limit for one purchase.`);
    for (const r of spending(data, assistant, now)) {
      if (r.limit > 0 && r.spent + amount > r.limit) reasons.push(`It would go over the ${usd(r.limit)} ${r.word} limit.`);
    }
  }
  const known = !norm(draft.party) || isTrusted(assistant, draft.party) || usedBefore(data, assistant, draft.party);
  for (const rule of assistant.rules || []) {
    if (rule.type === 'over' && amount > Number(rule.amount)) reasons.push(`You asked to OK anything over ${usd(rule.amount)}.`);
    if (rule.type === 'newPerson' && draft.kind === 'emailed' && !known) reasons.push('You asked to OK emails to someone new.');
    if (rule.type === 'newStore' && draft.kind !== 'emailed' && !known) reasons.push('You asked to OK a new store.');
    if (rule.type === 'custom' && (draft.ruleIds || []).includes(rule.id)) reasons.push(`Your rule: ${rule.text}.`);
  }
  if (reasons.length) return { outcome: 'ask', why: reasons.join(' ') };
  return { outcome: 'allowed', why: isTrusted(assistant, draft.party) ? `${draft.party} is on the trusted list.` : 'No rule or limit stopped it.' };
}

export function newestFirst(list) {
  return [...list].sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function lastAction(data, assistantId) {
  return newestFirst(data.actions.filter((a) => a.assistantId === assistantId && a.status === 'done'))[0] || null;
}

export function accessLive(x, now = new Date()) { return !x.expiresAt || new Date(x.expiresAt) > now; }

export function soonestExpiry(assistant, now = new Date()) {
  return (assistant.access || [])
    .filter((x) => x.expiresAt && new Date(x.expiresAt) > now)
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))[0] || null;
}

// Actions that can still be cancelled or returned, soonest deadline first.
export function undoable(data, now = new Date()) {
  return data.actions
    .filter((a) => a.status === 'done' && a.undoUntil && new Date(a.undoUntil) > now)
    .sort((a, b) => new Date(a.undoUntil) - new Date(b.undoUntil));
}

// Spending this month for each budget category. '' holds spending with no category.
export function categorySpend(data, now = new Date()) {
  const ids = new Set(data.categories.map((c) => c.id));
  const out = { '': 0 };
  data.categories.forEach((c) => { out[c.id] = 0; });
  const since = startOfMonth(now);
  for (const a of data.actions) {
    if (!counts(a) || new Date(a.at) < since) continue;
    out[ids.has(a.category) ? a.category : ''] += Number(a.amount);
  }
  return out;
}

export function totals(data, now = new Date()) {
  return {
    day: spentSince(data, null, startOfDay(now)),
    week: spentSince(data, null, startOfWeek(now)),
    month: spentSince(data, null, startOfMonth(now)),
  };
}

// The next date a repeating charge falls on, rolled forward past today.
export function nextCharge(sub, now = new Date()) {
  const d = new Date(sub.nextAt);
  let guard = 0;
  while (d <= now && guard++ < 600) {
    if (sub.every === 'year') d.setFullYear(d.getFullYear() + 1);
    else if (sub.every === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function monthlySubscriptionCost(data) {
  return data.subscriptions.reduce((s, x) =>
    s + Number(x.amount) * (x.every === 'year' ? 1 / 12 : x.every === 'week' ? 52 / 12 : 1), 0);
}

// What each assistant did and spent this calendar week (Sunday through Saturday).
export function weekSummary(data, now = new Date()) {
  const from = startOfWeek(now);
  const to = endOfWeek(now);
  const inWeek = data.actions.filter((a) => new Date(a.at) >= from && new Date(a.at) < to);
  const rows = data.assistants.map((assistant) => {
    const mine = inWeek.filter((a) => a.assistantId === assistant.id);
    const done = mine.filter((a) => a.status === 'done');
    const count = (fn) => mine.filter(fn).length;
    return {
      assistant,
      spent: done.reduce((s, a) => s + (Number(a.amount) || 0), 0),
      limit: (assistant.limits || {}).perWeek || 0,
      bought: done.filter((a) => a.kind === 'bought').length,
      booked: done.filter((a) => a.kind === 'booked').length,
      emailed: done.filter((a) => a.kind === 'emailed').length,
      flagged: count((a) => a.flag),
      approved: count((a) => a.approved && a.status !== 'declined'),
      declined: count((a) => a.status === 'declined'),
      undone: count((a) => a.status === 'undone'),
      held: count((a) => a.status === 'blocked' || a.status === 'stopped'),
      waiting: data.requests.filter((r) => r.assistantId === assistant.id).length,
      total: mine.length,
    };
  }).filter((r) => !r.assistant.removed || r.total > 0);
  return { from, to, rows, spent: rows.reduce((s, r) => s + r.spent, 0) };
}
