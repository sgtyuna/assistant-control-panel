// Small helpers shared by every screen.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const money = (n) => usd.format(Number(n) || 0);
export const moneyRound = (n) => usd0.format(Number(n) || 0);

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export function when(iso, now = new Date()) {
  const d = new Date(iso);
  const days = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  const t = timeFmt.format(d);
  if (days === 0) return `Today ${t}`;
  if (days === 1) return `Yesterday ${t}`;
  if (days > 1 && days < 7) return `${dayFmt.format(d)} ${t}`;
  return `${dateFmt.format(d)}, ${t}`;
}

export function daysUntil(iso, now = new Date()) {
  const n = Math.ceil((new Date(iso) - now) / 86400000);
  if (n <= 0) return 'today';
  return n === 1 ? 'in 1 day' : `in ${n} days`;
}

const PATHS = {
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  flag: '<path d="M6 21V4h11l-2 4 2 4H8v9z"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  bought: '<path d="M6 8h12l-1 12H7L6 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 8a3 3 0 016 0" fill="none" stroke="currentColor" stroke-width="2"/>',
  booked: '<rect x="4.5" y="6" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 10.5h15M8.5 4v4M15.5 4v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  emailed: '<rect x="3.5" y="6" width="17" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 7.5l7.5 6 7.5-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  other: '<circle cx="12" cy="12" r="3"/>',
  ok: '<path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3l7-2.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 12l2.2 2.2L15.2 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  assistants: '<rect x="4" y="4.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="4.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="13.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="13.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  activity: '<path d="M5 7h14M5 12h14M5 17h9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  more: '<circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  undo: '<path d="M8 8H15a4.5 4.5 0 010 9H9M8 8l3.5-3.5M8 8l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${PATHS[name] || PATHS.other}</svg>`;

// A plain letter badge. No company logos.
export function badge(name) {
  const words = String(name || '?').trim().split(/\s+/);
  const letters = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2);
  return `<span class="badge" aria-hidden="true">${esc(letters)}</span>`;
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

export const NOT_YET = 'This control starts working in the next stage. Nothing was changed.';

export function empty(title, body, extra = '') {
  return `<div class="empty"><h2>${esc(title)}</h2><p>${esc(body)}</p>${extra}</div>`;
}
