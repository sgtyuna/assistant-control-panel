// Small helpers shared by every screen.
import { stateOf } from './logic.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const money = (n) => usd.format(Number(n) || 0);
export const moneyRound = (n) => (Number.isInteger(Number(n) || 0) ? usd0 : usd).format(Number(n) || 0);

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
export const dateShort = (d) => dateFmt.format(new Date(d));
export const dayDate = (d) => `${dayFmt.format(new Date(d))} ${dateFmt.format(new Date(d))}`;
export const clock = (d) => timeFmt.format(new Date(d));

export function when(iso, now = new Date()) {
  const d = new Date(iso);
  const days = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  const t = timeFmt.format(d);
  if (days === 0) return `Today ${t}`;
  if (days === 1) return `Yesterday ${t}`;
  if (days === -1) return `Tomorrow ${t}`;
  if (Math.abs(days) < 7) return `${dayFmt.format(d)} ${t}`;
  return `${dateFmt.format(d)}, ${t}`;
}

export function daysUntil(iso, now = new Date()) {
  const n = Math.ceil((new Date(iso) - now) / 86400000);
  if (n <= 0) return 'today';
  return n === 1 ? 'in 1 day' : `in ${n} days`;
}

const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const PATHS = {
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" ${S} stroke-width="2.4"/>`,
  x: `<path d="M6 6l12 12M18 6L6 18" ${S} stroke-width="2.4"/>`,
  flag: '<path d="M6 21V4h11l-2 4 2 4H8v9z"/>',
  clock: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M12 7.5V12l3 2" ${S}/>`,
  moon: `<path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z" ${S}/>`,
  bought: `<path d="M6 8h12l-1 12H7L6 8z" ${S}/><path d="M9 8a3 3 0 016 0" ${S}/>`,
  booked: `<rect x="4.5" y="6" width="15" height="14" rx="2" ${S}/><path d="M4.5 10.5h15M8.5 4v4M15.5 4v4" ${S}/>`,
  emailed: `<rect x="3.5" y="6" width="17" height="12" rx="2" ${S}/><path d="M4.5 7.5l7.5 6 7.5-6" ${S}/>`,
  email: `<rect x="3.5" y="6" width="17" height="12" rx="2" ${S}/><path d="M4.5 7.5l7.5 6 7.5-6" ${S}/>`,
  calendar: `<rect x="4.5" y="6" width="15" height="14" rx="2" ${S}/><path d="M4.5 10.5h15M8.5 4v4M15.5 4v4" ${S}/>`,
  card: `<rect x="3.5" y="6" width="17" height="12" rx="2" ${S}/><path d="M3.5 10.5h17" ${S}/>`,
  other: '<circle cx="12" cy="12" r="3"/>',
  ok: `<path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3l7-2.8z" ${S}/><path d="M9 12l2.2 2.2L15.2 10" ${S}/>`,
  assistants: `<rect x="4" y="4.5" width="7" height="7" rx="1.5" ${S}/><rect x="13" y="4.5" width="7" height="7" rx="1.5" ${S}/><rect x="4" y="13.5" width="7" height="7" rx="1.5" ${S}/><rect x="13" y="13.5" width="7" height="7" rx="1.5" ${S}/>`,
  activity: `<path d="M5 7h14M5 12h14M5 17h9" ${S} stroke-width="2.2"/>`,
  money: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5v11" ${S} stroke-width="1.8"/>`,
  week: `<path d="M5 19V11M10 19V5M15 19v-6M20 19V8" ${S} stroke-width="2.4"/>`,
  settings: `<path d="M4 7h9M17 7h3M4 17h3M11 17h9" ${S}/><circle cx="15" cy="7" r="2" ${S}/><circle cx="9" cy="17" r="2" ${S}/>`,
  more: '<circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/>',
  alerts: `<path d="M6.5 16.5V11a5.5 5.5 0 0111 0v5.5l1.5 1.5h-14zM10 20.5h4" ${S}/>`,
  plus: `<path d="M12 5.5v13M5.5 12h13" ${S} stroke-width="2.4"/>`,
  undo: `<path d="M8 8H15a4.5 4.5 0 010 9H9M8 8l3.5-3.5M8 8l3.5 3.5" ${S}/>`,
  back: `<path d="M14.5 5.5L8 12l6.5 6.5" ${S} stroke-width="2.4"/>`,
  next: `<path d="M9.5 5.5L16 12l-6.5 6.5" ${S} stroke-width="2.4"/>`,
  trash: `<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" ${S}/>`,
  stop: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M6.2 6.2l11.6 11.6" ${S}/>`,
  repeat: `<path d="M5 11V9.5A2.5 2.5 0 017.5 7H18l-2.5-2.5M19 13v1.5a2.5 2.5 0 01-2.5 2.5H6l2.5 2.5" ${S}/>`,
};
export const icon = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${PATHS[name] || PATHS.other}</svg>`;

// A plain letter badge. No company logos.
export function badge(name) {
  const words = String(name || '?').trim().split(/\s+/);
  const letters = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2);
  return `<span class="badge" aria-hidden="true">${esc(letters)}</span>`;
}

export function assistantName(data, id) {
  const a = data.assistants.find((x) => x.id === id);
  if (!a) return 'Unknown assistant';
  return a.removed ? `${a.name} (removed)` : a.name;
}

// On, paused and quiet always show a word and an icon, never colour alone.
export function statePill(data, a, now = new Date()) {
  const st = stateOf(data, a, now);
  const then = { on: 'On', paused: 'Paused', quiet: 'In quiet hours' }[st.own];
  if (st.key === 'removed') return `<span class="state state-off">${icon('x')} Removed</span>`;
  if (st.key === 'pausedAll') return `<span class="state state-stop">${icon('pause')} Paused with everything</span><span class="muted small">After you resume: ${then}</span>`;
  if (st.key === 'paused') return `<span class="state state-paused">${icon('pause')} Paused</span>`;
  if (st.key === 'quiet') return `<span class="state state-quiet">${icon('moon')} Quiet until ${esc(when(st.until, now))}</span>`;
  return `<span class="state state-on">${icon('check')} On</span>`;
}

export function pauseSwitch(a) {
  return `
    <button class="switch ${a.paused ? '' : 'on'}" role="switch" aria-checked="${a.paused ? 'false' : 'true'}"
      aria-label="${esc(a.name)}: ${a.paused ? 'paused. Switch on' : 'on. Pause'}" data-act="toggle-pause" data-id="${esc(a.id)}">
      <span class="knob"></span><span class="switch-word">${a.paused ? 'Paused' : 'On'}</span>
    </button>`;
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
}

// A phone-style alert that drops in from the top.
let alertTimer;
export function showAlert(text) {
  const el = document.getElementById('alert-banner');
  el.innerHTML = `${icon('alerts')}<div><b>Phone alert</b><span>${esc(text)}</span></div>`;
  el.hidden = false;
  clearTimeout(alertTimer);
  alertTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

export function empty(title, body, extra = '') {
  return `<div class="empty"><h2>${esc(title)}</h2><p>${esc(body)}</p>${extra}</div>`;
}

// A yes/no question shown inside the app.
export function confirmBox(title, body, okLabel = 'Yes', danger = true) {
  const dlg = document.getElementById('confirm');
  dlg.innerHTML = `
    <form method="dialog" class="dialog-body">
      <h2>${esc(title)}</h2>
      <p class="muted">${esc(body)}</p>
      <div class="actions">
        <button class="btn" value="cancel">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" value="ok" id="confirm-ok">${esc(okLabel)}</button>
      </div>
    </form>`;
  dlg.returnValue = '';
  dlg.showModal();
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
  });
}

export function openSheet(html) {
  const dlg = document.getElementById('sheet');
  dlg.innerHTML = html;
  if (!dlg.open) dlg.showModal();
  const first = dlg.querySelector('input, select, textarea');
  if (first) first.focus();
}
export function closeSheet() {
  const dlg = document.getElementById('sheet');
  if (dlg.open) dlg.close();
  dlg.innerHTML = '';
}
