// Every change to the record goes through one of these. They work on a plain
// data object, so they behave the same on my information and on sample data.
import { decide } from './logic.js';

export const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const iso = (d) => new Date(d).toISOString();
const find = (list, id) => list.find((x) => x.id === id);

export function addAlert(data, text, kind, now = new Date()) {
  data.alerts.unshift({ id: uid('n'), at: iso(now), text, kind, read: false });
  if (data.alerts.length > 100) data.alerts.length = 100;
}

export function newAssistant(name, limits = {}) {
  return {
    id: uid('a'), name: String(name).trim(), paused: false, removed: false,
    limits: { perPurchase: null, perDay: null, perWeek: null, perMonth: null, ...limits },
    rules: [], trusted: [], blocked: [], access: [], quietHours: null,
  };
}

export function addAssistant(data, name, limits) {
  const a = newAssistant(name, limits);
  data.assistants.push(a);
  return a;
}

// Removing keeps the history. Anything still waiting is closed as a No.
export function removeAssistant(data, id, now = new Date()) {
  const a = find(data.assistants, id);
  if (!a) return;
  a.removed = true;
  a.removedAt = iso(now);
  data.requests.filter((r) => r.assistantId === id).forEach((r) => decline(data, r.id, now, 'The assistant was removed before you answered.'));
}

export function setPaused(data, id, paused) {
  const a = find(data.assistants, id);
  if (a) a.paused = !!paused;
}

// Pause Everything is one switch of its own. It never touches each
// assistant's own pause or quiet hours, so resuming puts each one back in
// the state it was in before.
export function setPausedAll(data, on) { data.settings.pausedAll = !!on; }

function makeSubscription(data, action) {
  const next = new Date(action.at);
  if (action.repeats === 'year') next.setFullYear(next.getFullYear() + 1); else next.setMonth(next.getMonth() + 1);
  data.subscriptions.push({
    id: uid('s'), assistantId: action.assistantId, name: action.party || action.text,
    amount: Number(action.amount) || 0, every: action.repeats, nextAt: iso(next), actionId: action.id,
  });
}

function fields(d) {
  return {
    assistantId: d.assistantId, kind: d.kind || 'bought', text: String(d.text || '').trim(),
    party: String(d.party || '').trim(), amount: Number(d.amount) || 0, category: d.category || null,
    ...(d.flag ? { flag: String(d.flag).trim() } : {}),
    ...(d.repeats ? { repeats: d.repeats } : {}),
  };
}

function recordDone(data, d, now, extra = {}) {
  const action = { id: uid('x'), ...fields(d), at: iso(d.at || now), status: 'done', ...extra };
  const hours = Number(d.undoHours) || 0;
  if (hours > 0) action.undoUntil = iso(new Date(now).getTime() + hours * 3600000);
  data.actions.push(action);
  if (action.repeats) makeSubscription(data, action);
  return action;
}

const nameOf = (data, id) => (find(data.assistants, id) || {}).name || 'An assistant';

// OK: the request moves to Activity as done and its amount starts counting.
export function approve(data, requestId, now = new Date()) {
  const r = find(data.requests, requestId);
  if (!r) return null;
  data.requests = data.requests.filter((x) => x.id !== requestId);
  return recordDone(data, { ...r, at: now }, now, { approved: true, askedAt: r.at });
}

// No: the request stays in the history, marked declined, and counts against nothing.
export function decline(data, requestId, now = new Date(), note = '') {
  const r = find(data.requests, requestId);
  if (!r) return null;
  data.requests = data.requests.filter((x) => x.id !== requestId);
  const action = { id: uid('x'), ...fields(r), at: iso(now), askedAt: r.at, status: 'declined', ...(note ? { note } : {}) };
  data.actions.push(action);
  return action;
}

// Undo: the action is marked undone and stays in the feed. Because only
// "done" actions count, its amount drops out of every total at once.
export function undo(data, actionId, now = new Date()) {
  const a = find(data.actions, actionId);
  if (!a || a.status !== 'done' || !a.undoUntil || new Date(a.undoUntil) <= now) return false;
  a.status = 'undone';
  a.undoneAt = iso(now);
  data.subscriptions = data.subscriptions.filter((s) => s.actionId !== a.id);
  return true;
}

// Something an assistant did or wants to do, added by hand.
// mode 'rules' lets the rules decide; 'ask' and 'done' place it directly.
export function submitDraft(data, draft, now = new Date(), mode = 'rules') {
  const assistant = find(data.assistants, draft.assistantId);
  if (!assistant) return { outcome: 'error', why: 'Pick an assistant first.' };
  const who = assistant.name;
  let verdict;
  if (mode === 'ask') verdict = { outcome: 'ask', why: draft.why || 'Added by hand.' };
  else if (mode === 'done') verdict = { outcome: 'allowed', why: 'Added by hand.' };
  else verdict = decide(data, assistant, draft, now);

  if (verdict.outcome === 'blocked' || verdict.outcome === 'paused') {
    const status = verdict.outcome === 'blocked' ? 'blocked' : 'stopped';
    data.actions.push({ id: uid('x'), ...fields(draft), at: iso(now), status, note: verdict.why });
    addAlert(data, `${who} was ${status === 'blocked' ? 'blocked' : 'stopped'}: ${draft.text}. ${verdict.why}`, status, now);
  } else if (verdict.outcome === 'ask') {
    data.requests.push({
      id: uid('r'), ...fields(draft), at: iso(now), why: verdict.why,
      ...(Number(draft.undoHours) > 0 ? { undoHours: Number(draft.undoHours) } : {}),
    });
    addAlert(data, `${who} needs your OK: ${draft.text}`, 'ask', now);
  } else {
    recordDone(data, draft, now);
    if (draft.flag) addAlert(data, `Unusual activity from ${who}: ${draft.flag}`, 'flag', now);
  }
  return verdict;
}

export { nameOf };
