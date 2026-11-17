// The behaviour rules, checked without a browser.  Run:  node --test tests/rules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decide, stateOf, spending, quietUntil, totals, categorySpend, undoable, weekSummary } from '../js/logic.js';
import * as ops from '../js/ops.js';
import { emptyInfo, migrate, toFileText, fromFileText, SCHEMA_VERSION } from '../js/store.js';
import { resolveDemo } from '../js/demo.js';
import { startOfWeek } from '../js/dates.js';

const NOW = new Date(2026, 10, 18, 12, 0, 0); // Wed Nov 18 2026, noon

function setup() {
  const data = emptyInfo();
  const a = ops.addAssistant(data, 'Helper', { perPurchase: 50, perDay: 100, perWeek: 200, perMonth: 400 });
  data.categories.push({ id: 'food', name: 'Food', monthlyBudget: 100 });
  return { data, a };
}
const buy = (a, extra = {}) => ({ assistantId: a.id, kind: 'bought', text: 'Buy a thing', party: 'Good Store', amount: 20, category: 'food', ...extra });

test('a trusted store over its limit still has to ask', () => {
  const { data, a } = setup();
  a.trusted.push('Good Store');
  assert.equal(decide(data, a, buy(a), NOW).outcome, 'allowed');
  const v = decide(data, a, buy(a, { amount: 60 }), NOW);
  assert.equal(v.outcome, 'ask');
  assert.match(v.why, /\$50 limit for one purchase/);
});

test('a store on both the trusted and blocked lists is blocked', () => {
  const { data, a } = setup();
  a.trusted.push('Good Store'); a.blocked.push('good store');
  assert.equal(decide(data, a, buy(a), NOW).outcome, 'blocked');
});

test('blocked beats paused, paused beats approve-first', () => {
  const { data, a } = setup();
  a.blocked.push('Bad Store'); a.paused = true;
  assert.equal(decide(data, a, buy(a, { party: 'Bad Store' }), NOW).outcome, 'blocked');
  assert.equal(decide(data, a, buy(a, { amount: 60 }), NOW).outcome, 'paused');
});

test('going over a daily, weekly or monthly limit counts as approve-first', () => {
  const { data, a } = setup();
  ops.submitDraft(data, buy(a, { amount: 45 }), NOW);
  ops.submitDraft(data, buy(a, { amount: 45 }), NOW);
  assert.equal(data.actions.filter((x) => x.status === 'done').length, 2);
  const v = ops.submitDraft(data, buy(a, { amount: 20 }), NOW);
  assert.equal(v.outcome, 'ask');
  assert.match(v.why, /\$100 daily limit/);
  assert.equal(data.requests.length, 1);
});

test('approve-first rules: over an amount, someone new, a new store', () => {
  const { data, a } = setup();
  a.rules.push({ id: 'r1', type: 'over', amount: 25 }, { id: 'r2', type: 'newPerson' }, { id: 'r3', type: 'newStore' });
  assert.equal(decide(data, a, buy(a, { amount: 30 }), NOW).outcome, 'ask');
  assert.equal(decide(data, a, buy(a, { amount: 10 }), NOW).outcome, 'ask', 'new store asks');
  a.trusted.push('Good Store');
  assert.equal(decide(data, a, buy(a, { amount: 10 }), NOW).outcome, 'allowed', 'a trusted store is not new');
  const mail = { assistantId: a.id, kind: 'emailed', text: 'Email Sam', party: 'Sam', amount: 0 };
  assert.equal(decide(data, a, mail, NOW).outcome, 'ask');
  a.trusted.push('Sam');
  assert.equal(decide(data, a, mail, NOW).outcome, 'allowed');
});

test('OK counts toward limits and budget; No counts against nothing', () => {
  const { data, a } = setup();
  ops.submitDraft(data, buy(a, { amount: 60 }), NOW);
  ops.submitDraft(data, buy(a, { amount: 70, text: 'Second' }), NOW);
  assert.equal(data.requests.length, 2);
  assert.equal(totals(data, NOW).month, 0);
  ops.approve(data, data.requests[0].id, NOW);
  assert.equal(spending(data, a, NOW).find((r) => r.key === 'month').spent, 60);
  assert.equal(categorySpend(data, NOW).food, 60);
  ops.decline(data, data.requests[0].id, NOW);
  assert.equal(data.requests.length, 0);
  assert.equal(totals(data, NOW).month, 60);
  const no = data.actions.find((x) => x.status === 'declined');
  assert.ok(no, 'the No stays in the history');
  assert.equal(no.amount, 70);
});

test('undo keeps the action in the feed and takes its amount back out', () => {
  const { data, a } = setup();
  ops.submitDraft(data, buy(a, { amount: 30, undoHours: 24 }), NOW);
  assert.equal(undoable(data, NOW).length, 1);
  assert.equal(totals(data, NOW).month, 30);
  const id = data.actions[0].id;
  assert.equal(ops.undo(data, id, NOW), true);
  assert.equal(data.actions[0].status, 'undone');
  assert.equal(totals(data, NOW).month, 0);
  assert.equal(categorySpend(data, NOW).food, 0);
  assert.equal(spending(data, a, NOW)[2].spent, 0);
  assert.equal(ops.undo(data, id, NOW), false, 'cannot undo twice');
});

test('an email cannot be undone, however it is added', () => {
  for (const mode of ['rules', 'done']) {
    const { data, a } = setup();
    ops.submitDraft(data, buy(a, { kind: 'emailed', amount: 0, undoHours: 24 }), NOW, mode);
    assert.equal(data.actions[0].undoUntil, undefined, mode);
    assert.equal(undoable(data, NOW).length, 0, mode);
    assert.equal(ops.undo(data, data.actions[0].id, NOW), false, mode);
  }
  const { data, a } = setup();
  ops.submitDraft(data, buy(a, { kind: 'emailed', amount: 0, undoHours: 24 }), NOW, 'ask');
  const done = ops.approve(data, data.requests[0].id, NOW);
  assert.equal(done.undoUntil, undefined, 'after OK');
});

test('undo is refused after the deadline', () => {
  const { data, a } = setup();
  ops.submitDraft(data, buy(a, { undoHours: 1 }), NOW);
  const later = new Date(NOW.getTime() + 2 * 3600000);
  assert.equal(ops.undo(data, data.actions[0].id, later), false);
});

test('resume after Pause Everything puts each assistant back as it was', () => {
  const { data, a } = setup();
  const b = ops.addAssistant(data, 'Second');
  const c = ops.addAssistant(data, 'Third');
  ops.setPaused(data, b.id, true);
  c.quietHours = { on: true, from: '09:00', to: '17:00', days: [] };
  assert.deepEqual([a, b, c].map((x) => stateOf(data, x, NOW).key), ['on', 'paused', 'quiet']);
  ops.setPausedAll(data, true);
  assert.deepEqual([a, b, c].map((x) => stateOf(data, x, NOW).key), ['pausedAll', 'pausedAll', 'pausedAll']);
  ops.setPausedAll(data, false);
  assert.deepEqual([a, b, c].map((x) => stateOf(data, x, NOW).key), ['on', 'paused', 'quiet']);
});

test('if quiet hours end while everything is paused, it stays paused until resume', () => {
  const { data, a } = setup();
  a.quietHours = { on: true, from: '09:00', to: '13:00', days: [] };
  ops.setPausedAll(data, true);
  const after = new Date(2026, 10, 18, 14, 0, 0);
  assert.equal(stateOf(data, a, after).key, 'pausedAll');
  ops.setPausedAll(data, false);
  assert.equal(stateOf(data, a, after).key, 'on');
});

test('quiet hours: overnight, by day, and either all-assistants or its own', () => {
  const night = { on: true, from: '22:00', to: '06:30', days: [] };
  assert.ok(quietUntil(night, new Date(2026, 10, 18, 23, 0)));
  assert.ok(quietUntil(night, new Date(2026, 10, 18, 5, 0)));
  assert.equal(quietUntil(night, new Date(2026, 10, 18, 12, 0)), null);
  assert.equal(quietUntil({ ...night, on: false }, new Date(2026, 10, 18, 23, 0)), null);
  const sundays = { on: true, from: '00:00', to: '23:59', days: [0] };
  assert.ok(quietUntil(sundays, new Date(2026, 10, 15, 23, 59, 30)));
  assert.equal(quietUntil(sundays, new Date(2026, 10, 16, 0, 30)), null);
  const { data, a } = setup();
  data.settings.quietHours = { on: true, from: '11:00', to: '13:00', days: [] };
  assert.equal(stateOf(data, a, NOW).key, 'quiet');
  assert.equal(decide(data, a, buy(a), NOW).outcome, 'paused');
});

test("a removed assistant's history stays in the record, marked as removed", () => {
  const { data, a } = setup();
  ops.submitDraft(data, buy(a), NOW);
  ops.submitDraft(data, buy(a, { amount: 60 }), NOW);
  ops.removeAssistant(data, a.id, NOW);
  assert.equal(a.removed, true);
  assert.equal(data.requests.length, 0);
  assert.equal(data.actions.filter((x) => x.assistantId === a.id).length, 2);
  const back = fromFileText(toFileText(data, NOW)).info;
  assert.equal(back.assistants[0].removed, true);
  assert.equal(back.actions.length, 2);
});

test('weeks run Sunday through Saturday', () => {
  assert.equal(startOfWeek(NOW).getDay(), 0);
  const { data, a } = setup();
  ops.submitDraft(data, buy(a, { at: new Date(2026, 10, 15, 0, 5) }), NOW, 'done');   // Sunday
  ops.submitDraft(data, buy(a, { at: new Date(2026, 10, 14, 23, 55) }), NOW, 'done'); // Saturday before
  assert.equal(weekSummary(data, NOW).spent, 20);
});

test('the saved file has a version; older files open; newer files are refused plainly', () => {
  const { data } = setup();
  const text = toFileText(data, NOW);
  assert.equal(JSON.parse(text).schemaVersion, SCHEMA_VERSION);
  const v1 = { schemaVersion: 1, settings: { homeScreen: 'ok', quietHours: null }, categories: [], requests: [], actions: [], subscriptions: [],
    assistants: [{ id: 'old', name: 'Old', paused: true, limits: { perMonth: 50 }, rules: ['Ask me before anything odd'], trusted: ['A'], blocked: [], access: [], quietHours: null }] };
  const opened = fromFileText(JSON.stringify(v1)).info;
  assert.equal(opened.schemaVersion, SCHEMA_VERSION);
  assert.equal(opened.assistants[0].rules[0].type, 'custom');
  assert.equal(opened.assistants[0].paused, true);
  assert.deepEqual(opened.alerts, []);
  assert.equal(opened.settings.pausedAll, false);
  const newer = fromFileText(JSON.stringify({ app: 'assistant-control-panel', schemaVersion: 99, info: { ...data, schemaVersion: 99 } }));
  assert.match(newer.error, /newer version/);
  assert.match(fromFileText('not json').error, /not a saved copy/);
  assert.match(fromFileText('{"hello":1}').error, /not a saved copy/);
  assert.equal(migrate({ schemaVersion: 99 }), null);
});

test('sample data: every screen has something to show', () => {
  const raw = JSON.parse(readFileSync(new URL('../data/demo.json', import.meta.url)));
  const data = migrate(resolveDemo(raw, NOW));
  const ids = new Set(data.assistants.map((a) => a.id));
  for (const list of [data.requests, data.actions, data.subscriptions]) for (const x of list) assert.ok(ids.has(x.assistantId), x.id);
  assert.equal(data.assistants.length, 9);
  assert.ok(data.requests.length >= 3);
  assert.ok(data.assistants.some((a) => spending(data, a, NOW).some((r) => r.limit && r.ratio >= 0.8 && r.ratio < 1)), 'one near its limit');
  const spend = categorySpend(data, NOW);
  assert.ok(data.categories.some((c) => spend[c.id] > c.monthlyBudget), 'one category over budget');
  assert.ok(data.actions.filter((a) => a.flag).length >= 2);
  assert.ok(data.subscriptions.length >= 3);
  assert.ok(undoable(data, NOW).length >= 3);
  assert.ok(data.assistants.some((a) => a.access.some((x) => x.expiresAt)));
  assert.ok(data.assistants.some((a) => a.paused));
});
