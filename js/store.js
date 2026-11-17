// The store keeps three things apart:
//   1. My information  -> this browser's local storage, key MY_KEY. Never in the code.
//   2. Sample data     -> data/demo.json. While Demo mode is on, a working copy
//                         sits under DEMO_KEY so changes survive a reload. Turning
//                         Demo mode off deletes that copy, so nothing is left behind.
//   3. Shell switches  -> SHELL_KEY (only "is Demo mode on"). Not part of my information.
// Screens read store.data, which is whichever of 1 or 2 is showing, and change
// it through store.update(). This is the only file that touches local storage,
// so real connections can replace it later.
import { resolveDemo } from './demo.js';

export const SCHEMA_VERSION = 2;
export const APP_ID = 'assistant-control-panel';
const MY_KEY = 'acp.myInfo';
const SHELL_KEY = 'acp.shell';
const DEMO_KEY = 'acp.demo';

export function emptyInfo() {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { homeScreen: null, quietHours: null, pausedAll: false },
    categories: [],
    assistants: [],
    requests: [],
    actions: [],
    subscriptions: [],
    alerts: [],
  };
}

let seq = 0;
const tmpId = (p) => `${p}_m${Date.now().toString(36)}${(seq++).toString(36)}`;

function tidyQuiet(q) {
  if (!q || !q.from || !q.to) return null;
  return { on: q.on !== false, from: q.from, to: q.to, days: Array.isArray(q.days) ? q.days.map(Number) : [] };
}

function tidyAssistant(a) {
  return {
    paused: false, removed: false, ...a,
    limits: { perPurchase: null, perDay: null, perWeek: null, perMonth: null, ...(a.limits || {}) },
    // Version 1 wrote rules as plain sentences. They become written rules.
    rules: (a.rules || []).map((r) => (typeof r === 'string' ? { id: tmpId('u'), type: 'custom', text: r } : { id: tmpId('u'), ...r })),
    trusted: [...(a.trusted || [])],
    blocked: [...(a.blocked || [])],
    access: (a.access || []).map((x) => ({ id: tmpId('c'), ...x })),
    quietHours: tidyQuiet(a.quietHours),
  };
}

// Bring an older record up to the current shape. Add a step here each time
// SCHEMA_VERSION goes up. Returns null if the record is from a newer shell.
//   1 -> 2: adds alerts and Pause Everything; rules become objects.
export function migrate(info) {
  if (!info || typeof info !== 'object') return emptyInfo();
  const v = Number(info.schemaVersion) || 1;
  if (v > SCHEMA_VERSION) return null;
  const base = emptyInfo();
  const list = (x) => (Array.isArray(x) ? x : []);
  const settings = { ...base.settings, ...(info.settings || {}) };
  settings.quietHours = tidyQuiet(settings.quietHours);
  return {
    ...base, ...info, schemaVersion: SCHEMA_VERSION, settings,
    categories: list(info.categories),
    assistants: list(info.assistants).map(tidyAssistant),
    requests: list(info.requests),
    actions: list(info.actions),
    subscriptions: list(info.subscriptions),
    alerts: list(info.alerts),
  };
}

// The saved file: one JSON file with a version number in it.
export function toFileText(info, now = new Date()) {
  return JSON.stringify({ app: APP_ID, kind: 'my-information', schemaVersion: SCHEMA_VERSION, savedAt: now.toISOString(), info }, null, 2);
}

export function fromFileText(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return { error: 'That file could not be read. It is not a saved copy from this app.' }; }
  const info = obj && obj.info ? obj.info : obj;
  if (!info || typeof info !== 'object' || !Array.isArray(info.assistants) || !info.settings) {
    return { error: 'That file is not a saved copy from this app.' };
  }
  const version = Number(obj.schemaVersion || info.schemaVersion) || 1;
  if (version > SCHEMA_VERSION) {
    return { error: `That file was saved by a newer version of this app (file version ${version}, this app reads up to ${SCHEMA_VERSION}). Nothing was changed. Update the app, then load it again.` };
  }
  return { info: migrate({ ...info, schemaVersion: version }) };
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
  tooNew: false,        // true if the stored record came from a newer shell

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
    if (this.demo) await this.loadDemo(false);
  },

  write(key, value) {
    if (!this.storageOk) return;
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { this.storageOk = false; this.emit(); }
  },

  saveMy() { if (!this.tooNew) this.write(MY_KEY, this.my); },
  save() { if (this.demo && this.demoData) this.write(DEMO_KEY, this.demoData); else this.saveMy(); },

  // Change whichever record is showing, keep it, and redraw.
  update(fn) {
    const result = fn(this.data);
    this.save();
    this.emit();
    return result;
  },

  async loadDemo(fresh) {
    try {
      let working = null;
      if (!fresh) { try { working = read(DEMO_KEY); } catch (e) { working = null; } }
      if (working) this.demoData = migrate(working);
      else {
        const res = await fetch('data/demo.json', { cache: 'no-cache' });
        this.demoData = migrate(resolveDemo(await res.json(), new Date()));
        this.write(DEMO_KEY, this.demoData);
      }
    } catch (e) {
      this.demoData = null;
      this.demo = false;
    }
  },

  async setDemo(on) {
    this.demo = !!on;
    if (this.demo) await this.loadDemo(false);
    else {
      this.demoData = null;
      try { localStorage.removeItem(DEMO_KEY); } catch (e) { this.storageOk = false; }
    }
    this.write(SHELL_KEY, { demo: this.demo });
    this.emit();
    return this.demo === !!on;
  },

  // Demo mode: back to the starting sample data.
  async resetDemo() {
    if (!this.demo) return false;
    await this.loadDemo(true);
    this.emit();
    return !!this.demoData;
  },

  // The home screen is my choice, so it lives with my information.
  setHomeScreen(key) {
    this.my.settings.homeScreen = key;
    this.saveMy();
    this.emit();
  },

  fileText() { return toFileText(this.my); },

  loadFileText(text) {
    const res = fromFileText(text);
    if (res.error) return res;
    this.my = res.info;
    this.tooNew = false;
    this.saveMy();
    this.emit();
    return { ok: true };
  },

  eraseMy() {
    this.my = emptyInfo();
    this.tooNew = false;
    try { localStorage.removeItem(MY_KEY); } catch (e) { this.storageOk = false; }
    this.emit();
  },

  subscribe(fn) { listeners.add(fn); },
  emit() { listeners.forEach((fn) => fn()); },
};
