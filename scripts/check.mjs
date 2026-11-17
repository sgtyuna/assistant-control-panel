// Quick checks that need no browser. Run from the repo folder:  node scripts/check.mjs
// Checks the sample data, the sums, the early-morning times and the storage warnings.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const raw = JSON.parse(readFileSync(root + 'data/demo.json', 'utf8'));

// A stand-in for the browser's local storage, which can be told to fail.
const mem = new Map();
let failWrites = false;
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (failWrites) throw new Error('full'); mem.set(k, String(v)); },
  removeItem: (k) => mem.delete(k),
};
globalThis.fetch = async () => ({ json: async () => JSON.parse(JSON.stringify(raw)) });

const { store, emptyInfo, migrate } = await import('../js/store.js');
const { resolveDemo } = await import('../js/demo.js');
const { spending, counts } = await import('../js/logic.js');

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}
const near = (a, b) => Math.abs(a - b) < 0.005;

// ---- The sample data holds together
const ids = (list) => list.map((x) => x.id);
const unique = (list) => new Set(list).size === list.length;
check('assistant, request, action and subscription ids are unique',
  unique(ids(raw.assistants)) && unique(ids(raw.requests)) && unique(ids(raw.actions)) && unique(ids(raw.subscriptions)));
const aIds = new Set(ids(raw.assistants)), cIds = new Set(ids(raw.categories));
check('every item points at an assistant that exists',
  [...raw.requests, ...raw.actions, ...raw.subscriptions].every((x) => aIds.has(x.assistantId)));
check('every category named on an item exists',
  [...raw.requests, ...raw.actions].every((x) => x.category == null || cIds.has(x.category)));
check('9 assistants, 1 paused', raw.assistants.length === 9 && raw.assistants.filter((a) => a.paused).length === 1);
check('5 requests waiting, $183.39 in all',
  raw.requests.length === 5 && near(raw.requests.reduce((s, r) => s + Number(r.amount || 0), 0), 183.39));

// ---- Sums on a fixed day (Monday Nov 16 2026, noon)
const noon = new Date(2026, 10, 16, 12, 0, 0);
const data = resolveDemo(JSON.parse(JSON.stringify(raw)), noon);
const by = (id) => data.assistants.find((a) => a.id === id);
const row = (id, key) => spending(data, by(id), noon).find((r) => r.key === key).spent;
check('23 actions: 21 done, 1 undone, 1 declined',
  data.actions.length === 23 && data.actions.filter((a) => a.status === 'done').length === 21 &&
  data.actions.filter((a) => a.status === 'undone').length === 1 && data.actions.filter((a) => a.status === 'declined').length === 1);
check('3 flagged, 6 booked', data.actions.filter((a) => a.flag).length === 3 && data.actions.filter((a) => a.kind === 'booked').length === 6);
check('Gemini has spent $138 this week', near(row('gemini', 'week'), 138), row('gemini', 'week'));
check('ChatGPT has spent $437 this month', near(row('chatgpt', 'month'), 437), row('chatgpt', 'month'));
check('Alexa has spent $474.10 this month', near(row('alexa', 'month'), 474.10), row('alexa', 'month'));
check('undone and declined actions do not count as spending',
  data.actions.filter((a) => a.status !== 'done').every((a) => !counts(a)));
check('the sample "about" note is not carried into the data', !('about' in data));
check('5 actions can still be undone, each with a deadline after now',
  data.actions.filter((a) => a.undoUntil).length === 5 && data.actions.filter((a) => a.undoUntil).every((a) => new Date(a.undoUntil) > noon));
check('at noon every item keeps its written clock time',
  new Date(data.requests[1].at).getHours() === 9 && new Date(data.requests[1].at).getMinutes() === 12);

// ---- Times at every hour of several days (a Sunday and the 1st of a month included)
let timesOk = true, why = '';
for (const [y, mo, d] of [[2026, 10, 16], [2026, 10, 15], [2026, 10, 1], [2026, 11, 1], [2027, 0, 1]]) {
  for (let h = 0; h < 24 && timesOk; h++) {
    const now = new Date(y, mo, d, h, 7, 0);
    const r = resolveDemo(JSON.parse(JSON.stringify(raw)), now);
    const all = [...r.requests, ...r.actions].map((x) => new Date(x.at).getTime());
    if (all.some((t) => t > now.getTime())) { timesOk = false; why = `${now}: an item is in the future`; }
    if (!unique(r.requests.map((x) => x.at))) { timesOk = false; why = `${now}: two requests share a time`; }
    const today = r.actions.filter((a) => new Date(a.at) >= new Date(y, mo, d)).map((a) => a.at);
    if (!unique(today)) { timesOk = false; why = `${now}: two of today's actions share a time`; }
    // the written order of today's requests (newest first in the file) is kept
    const req = r.requests.map((x) => new Date(x.at).getTime());
    if (!(req[0] > req[1] && req[1] > req[2])) { timesOk = false; why = `${now}: today's requests lost their order`; }
  }
}
check('at any hour: nothing in the future, no shared times, order kept', timesOk, why);

// ---- Storage
check('an empty record has no assistants, actions or requests',
  emptyInfo().assistants.length === 0 && emptyInfo().actions.length === 0 && emptyInfo().requests.length === 0);
check('a record from a newer version is refused, not changed', migrate({ schemaVersion: 99 }) === null);

await store.init();
check('first open: no home screen picked, Demo mode off', store.my.settings.homeScreen === null && store.demo === false);
store.setHomeScreen('activity');
await store.setDemo(true);
check('Demo mode shows sample data', store.data.assistants.length === 9);
check('sample data never enters my information',
  store.my.assistants.length === 0 && !mem.get('acp.myInfo').includes('Fernhill'));
await store.setDemo(false);
check('turning Demo mode off leaves nothing behind', store.demoData === null && store.data.assistants.length === 0);

let emits = 0;
store.subscribe(() => { emits++; });
failWrites = true;
emits = 0; store.saveMy();
check('a failed save raises the warning straight away', store.storageOk === false && emits > 0);
store.storageOk = true; emits = 0;
await store.setDemo(true);
check('a failed Demo-mode save raises the warning too', store.storageOk === false && emits > 0);

// A record from a newer version is in this browser: loading a file must ask first.
failWrites = false; store.storageOk = true;
await store.setDemo(false);
const newer = JSON.stringify({ schemaVersion: 99, assistants: [{ id: 'a1', name: 'Kept' }] });
mem.set('acp.myInfo', newer);
store.my = emptyInfo(); store.tooNew = false;
await store.init();
check('a newer stored record counts as something a loaded file would replace', store.tooNew === true && store.hasStored === true);
store.saveMy();
check('a newer stored record is left alone until a file is loaded on purpose', mem.get('acp.myInfo') === newer);
store.eraseMy();
check('an empty record is nothing to replace', store.hasStored === false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
