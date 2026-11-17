// Sums and states worked out from the record. No screen code here, so these
// rules can be reused as they are if the screens are rebuilt later.
import { startOfDay, startOfWeek, startOfMonth } from './store.js';

// Only actions that really happened and still stand count as spending.
export function counts(action) {
  return action.status === 'done' && Number(action.amount) > 0;
}

export function spentSince(data, assistantId, since) {
  return data.actions
    .filter((a) => a.assistantId === assistantId && counts(a) && new Date(a.at) >= since)
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

export function lastAction(data, assistantId) {
  return data.actions
    .filter((a) => a.assistantId === assistantId && a.status !== 'declined')
    .sort((a, b) => new Date(b.at) - new Date(a.at))[0] || null;
}

export function newestFirst(list) {
  return [...list].sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function soonestExpiry(assistant) {
  return (assistant.access || [])
    .filter((x) => x.expiresAt)
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))[0] || null;
}
