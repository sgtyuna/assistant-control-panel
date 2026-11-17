// The store keeps three things apart:
//   1. My information  -> this browser's local storage, key MY_KEY. Never in the code.
//   2. Sample data     -> data/demo.json, read only while Demo mode is on, held in memory.
//   3. Shell switches  -> SHELL_KEY (only "is Demo mode on"). Not part of my information.
// Views read store.data, which is whichever of 1 or 2 is showing. They never
// touch local storage directly, so real connections can replace this file later.

export const SCHEMA_VERSION = 1;
const MY_KEY = 'acp.myInfo';
const SHELL_KEY = 'acp.shell';

export function emptyInfo() {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { homeScreen: null, quietHours: null },
    categories: [],
    assistants: [],
    requests: [],
    actions: [],
    subscriptions: [],
  };
}

// Bring an older saved record up to the current shape. Add a step here each
// time SCHEMA_VERSION goes up. Returns null if the record is from a newer shell.
export function migrate(info) {
  if (!info || typeof info !== 'object') return emptyInfo();
  const v = Number(info.schemaVersion) || 1;
  if (v > SCHEMA_VERSION) return null;
  const base = emptyInfo();
  return { ...base, ...info, settings: { ...base.settings, ...(info.settings || {}) }, schemaVersion: SCHEMA_VERSION };
}

function read(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

const listeners = new Set();

export const store = {
  my: emptyInfo(),      // my information (always loaded)
  demoData: null,       // sample data, only while Demo mode is on
  demo: false,          // is Demo mode on
  storageOk: true,      // false if this browser will not keep information
  tooNew: false,        // true if the saved record came from a newer shell

  get data() { return this.demo && this.demoData ? this.demoData : this.my; },

  async init() {
    try {
      const probe = '__acp_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      const saved = read(MY_KEY);
      if (saved) {
        const m = migrate(saved);
        if (m) this.my = m; else this.tooNew = true;
      }
      this.demo = !!(read(SHELL_KEY) || {}).demo;
    } catch (e) {
      this.storageOk = false;
    }
    if (this.demo) await this.loadDemo();
  },

  saveMy() {
    if (!this.storageOk || this.tooNew) return;
    try { localStorage.setItem(MY_KEY, JSON.stringify(this.my)); }
    catch (e) { this.storageOk = false; }
  },

  async loadDemo() {
    try {
      const res = await fetch('data/demo.json', { cache: 'no-cache' });
      this.demoData = resolveDemo(await res.json(), new Date());
    } catch (e) {
      this.demoData = null;
      this.demo = false;
    }
  },

  async setDemo(on) {
    this.demo = !!on;
    if (this.demo) await this.loadDemo(); else this.demoData = null;
    try { localStorage.setItem(SHELL_KEY, JSON.stringify({ demo: this.demo })); } catch (e) { /* shown via storageOk */ }
    this.emit();
    return this.demo === !!on;
  },

  // The home screen is my choice, so it lives with my information.
  setHomeScreen(key) {
    this.my.settings.homeScreen = key;
    this.saveMy();
    this.emit();
  },

  subscribe(fn) { listeners.add(fn); },
  emit() { listeners.forEach((fn) => fn()); },
};

// ---- Sample data: turn "2 days ago at 09:30" into real dates -------------

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function startOfWeek(d) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; } // Sunday
export function startOfMonth(d) { const x = startOfDay(d); x.setDate(1); return x; }

function resolveWhen(when, within, now) {
  const [h, m] = (when.time || '12:00').split(':').map(Number);
  let d = startOfDay(now);
  d.setDate(d.getDate() - (when.daysAgo || 0));
  const floor = within === 'week' ? startOfWeek(now) : within === 'month' ? startOfMonth(now) : null;
  if (floor && d < floor) d = new Date(floor);
  d.setHours(h, m, 0, 0);
  if (d > now) d = new Date(now.getTime() - 20 * 60000);
  return d.toISOString();
}

export function resolveDemo(raw, now) {
  const inDays = (n) => new Date(now.getTime() + n * 86400000).toISOString();
  const data = { ...emptyInfo(), ...raw };
  delete data.about;
  data.assistants = raw.assistants.map((a) => ({
    ...a,
    access: (a.access || []).map(({ expiresInDays, ...rest }) =>
      expiresInDays == null ? rest : { ...rest, expiresAt: inDays(expiresInDays) }),
  }));
  data.requests = raw.requests.map(({ when, ...r }) => ({ ...r, at: resolveWhen(when, null, now) }));
  data.actions = raw.actions.map(({ when, within, undoInHours, ...a }) => ({
    status: 'done', ...a,
    at: resolveWhen(when, within, now),
    ...(undoInHours ? { undoUntil: new Date(now.getTime() + undoInHours * 3600000).toISOString() } : {}),
  }));
  data.subscriptions = raw.subscriptions.map(({ nextInDays, ...s }) => ({ ...s, nextAt: inDays(nextInDays) }));
  return data;
}
