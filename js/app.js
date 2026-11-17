import { store, SCHEMA_VERSION } from './store.js';
import * as ops from './ops.js';
import { stateOf } from './logic.js';
import { esc, icon, money, toast, showAlert, confirmBox, openSheet, closeSheet } from './ui.js';
import { renderNeedsOk } from './views/needs-ok.js';
import { renderAssistants } from './views/assistants.js';
import { renderDetail } from './views/assistant-detail.js';
import { renderActivity, onActivityClick, onActivityChange, filters } from './views/activity.js';
import { renderMoney } from './views/money.js';
import { renderWeek } from './views/week.js';
import { renderSettings } from './views/settings.js';
import { renderMore } from './views/more.js';
import { renderAlerts } from './views/alerts.js';
import { renderFirstOpen } from './views/first-open.js';
import { addAssistantForm, addActionForm, categoryForm, subscriptionForm } from './views/forms.js';

const SCREENS = {
  ok: renderNeedsOk, assistants: renderAssistants, activity: renderActivity, money: renderMoney,
  week: renderWeek, settings: renderSettings, more: renderMore, alerts: renderAlerts,
};
// "wide" items show in the side rail on a computer; "narrow" ones only on a phone.
const NAV = [
  { key: 'ok', label: 'Needs OK' },
  { key: 'assistants', label: 'Assistants' },
  { key: 'activity', label: 'Activity' },
  { key: 'money', label: 'Money' },
  { key: 'week', label: 'This week', size: 'wide' },
  { key: 'alerts', label: 'Alerts', size: 'wide' },
  { key: 'settings', label: 'Settings', size: 'wide' },
  { key: 'more', label: 'More', size: 'narrow' },
];

const $ = (id) => document.getElementById(id);
let choosing = false;    // true while the home screen chooser is open from Settings
let chooserOpen = false; // was the chooser showing after the last render

function route() {
  const h = decodeURIComponent(location.hash.replace('#', ''));
  if (h.startsWith('a-')) return { key: 'detail', id: h.slice(2) };
  if (SCREENS[h]) return { key: h };
  return { key: SCREENS[store.my.settings.homeScreen] ? store.my.settings.homeScreen : 'ok' };
}

function render() {
  const home = store.my.settings.homeScreen;
  const data = store.data;

  // First open: nothing else shows until a home screen is picked.
  const showChooser = !home || choosing;
  $('chooser').innerHTML = showChooser ? renderFirstOpen(home, !store.demo) : '';
  $('shell').hidden = !home;
  $('shell').inert = showChooser; // nothing behind the chooser can be tabbed to
  if (showChooser && !chooserOpen) {
    const first = $('chooser').querySelector('.choice.is-current') || $('chooser').querySelector('.choice');
    if (first) first.focus();
  }
  const justClosed = chooserOpen && !showChooser;
  chooserOpen = showChooser;
  if (!home) return;

  // Remember which control had the keyboard, so it keeps it after the redraw.
  const active = document.activeElement;
  const focusKey = active && active.dataset && active.dataset.act && $('shell').contains(active)
    ? `[data-act="${active.dataset.act}"]${active.dataset.id ? `[data-id="${CSS.escape(active.dataset.id)}"]` : ''}` : null;

  const r = route();
  const hasAssistants = data.assistants.some((a) => !a.removed);
  const ctx = {
    demo: store.demo,
    homeScreen: home,
    storageOk: store.storageOk,
    version: SCHEMA_VERSION,
    canAdd: hasAssistants,
    emptyExtra: hasAssistants
      ? `<button class="btn btn-primary" data-act="open-add">${icon('plus')} Add by hand</button>`
      : `<button class="btn btn-primary" data-act="open-add-assistant">${icon('plus')} Add your first assistant</button>
         ${store.demo ? '' : '<button class="btn" data-act="toggle-demo">Or look around in Demo mode</button>'}`,
  };
  $('view').innerHTML = r.key === 'detail' ? renderDetail(data, ctx, r.id) : SCREENS[r.key](data, ctx);
  $('view').dataset.tab = r.key;

  // Top bar: Demo strip, alerts bell, Pause Everything.
  const pausedAll = !!data.settings.pausedAll;
  const unread = data.alerts.filter((n) => !n.read).length;
  $('demo-strip').hidden = !store.demo;
  $('topbar').classList.toggle('is-paused', pausedAll);
  $('brand').innerHTML = pausedAll
    ? `${icon('pause')}<span>Everything is paused</span>`
    : '<span class="brand-long">Assistant Control Panel</span><span class="brand-short">Control Panel</span>';
  $('bell').innerHTML = `${icon('alerts')}${unread ? `<b class="count">${unread}</b>` : ''}`;
  $('bell').setAttribute('aria-label', unread ? `Alerts, ${unread} new` : 'Alerts');
  $('pause-all').innerHTML = pausedAll ? `${icon('play')}<span>Resume<span class="long"> everything</span></span>` : `${icon('pause')}<span>Pause<span class="long"> Everything</span></span>`;
  $('pause-all').setAttribute('aria-label', pausedAll ? 'Resume everything' : 'Pause Everything');
  $('pause-all').setAttribute('aria-pressed', String(pausedAll));

  $('notice').hidden = store.storageOk && !store.tooNew;
  $('notice').textContent = store.tooNew
    ? 'Your saved information was made by a newer version of this app, so this version cannot open it. Nothing was changed. Update the app to see it.'
    : 'This browser will not let the app keep information. Nothing you choose will be remembered after you close the page.';

  const activeKey = r.key === 'detail' ? 'assistants' : r.key;
  const underMore = ['week', 'alerts', 'settings'].includes(activeKey);
  const waiting = data.requests.length;
  $('nav').innerHTML = NAV.map((t) => {
    const on = t.key === activeKey || (t.key === 'more' && underMore);
    const count = t.key === 'ok' ? waiting : t.key === 'alerts' ? unread : t.key === 'more' ? unread : 0;
    return `<a href="#${t.key}" class="${on ? 'is-active' : ''} ${t.size || ''}" ${t.key === activeKey ? 'aria-current="page"' : ''}>
      ${icon(t.key)}<span>${t.label}</span>${count ? `<b class="count">${count}</b>` : ''}</a>`;
  }).join('');

  if (justClosed) {
    const back = $('view').querySelector('[data-act="choose-home"]') || $('nav').querySelector('.is-active');
    if (back) back.focus();
  } else if (focusKey) {
    const again = $('shell').querySelector(focusKey);
    if (again) again.focus({ preventScroll: true });
  }
}

// Change the record that is showing. If the change raised an alert, show it.
function change(fn) {
  const before = (store.data.alerts[0] || {}).id;
  const out = store.update(fn);
  const top = store.data.alerts[0];
  if (top && top.id !== before && !top.read) showAlert(top.text);
  return out;
}

const assistant = (id) => store.data.assistants.find((a) => a.id === id);
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Math.max(0, Number(v)));
const clean = (v) => String(v || '').trim();

function download(name, text) {
  const file = new File([text], name, { type: 'application/json' });
  // On an iPhone home-screen app, the share sheet is the way to save a file.
  if (navigator.standalone && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: name }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---- Buttons and switches -------------------------------------------------

const acts = {
  approve(id) {
    const r = store.data.requests.find((x) => x.id === id);
    if (!r) return;
    const who = assistant(r.assistantId);
    change((d) => ops.approve(d, id));
    toast(Number(r.amount) > 0 ? `OK. ${money(r.amount)} now counts toward ${who ? who.name : 'its'} limits${r.category ? ' and budget' : ''}.` : 'OK. It is in Activity as done.');
  },
  decline(id) {
    change((d) => ops.decline(d, id));
    toast('No. It stays in Activity, marked as declined. Nothing was spent.');
  },
  undo(id) {
    const a = store.data.actions.find((x) => x.id === id);
    const done = change((d) => ops.undo(d, id));
    toast(done ? `Undone.${a && Number(a.amount) > 0 ? ` ${money(a.amount)} is back out of the totals.` : ''}` : 'That can no longer be undone.');
  },
  'toggle-pause'(id) {
    const a = assistant(id);
    if (!a) return;
    const pause = !a.paused;
    change((d) => ops.setPaused(d, id, pause));
    const st = stateOf(store.data, assistant(id));
    toast(pause ? `${a.name} is paused.`
      : st.key === 'pausedAll' ? `${a.name} is switched on, but everything is still paused.`
      : st.key === 'quiet' ? `${a.name} is switched on. It is in quiet hours right now.`
      : `${a.name} is on.`);
  },
  'pause-all'() {
    const on = !store.data.settings.pausedAll;
    change((d) => ops.setPausedAll(d, on));
    toast(on ? 'Everything is paused. No assistant can act until you resume.' : 'Resumed. Each assistant is back in the state it was in before.');
  },
  'open-add-assistant'() { openSheet(addAssistantForm(store.nameIdeas, store.data)); },
  'open-add'(id, el) {
    if (!store.data.assistants.some((a) => !a.removed)) { openSheet(addAssistantForm(store.nameIdeas, store.data)); return; }
    openSheet(addActionForm(store.data, id, el.dataset.mode));
  },
  'close-sheet'() { closeSheet(); },
  'pick-name'(id, el) {
    const input = $('new-assistant-name');
    input.value = el.dataset.value;
    el.closest('.picks').querySelectorAll('.pick').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    input.focus();
  },
  async 'remove-assistant'(id) {
    const a = assistant(id);
    if (!a) return;
    if (!await confirmBox(`Remove ${a.name}?`, 'It leaves your assistants. Its history stays in your record and in your saved copy, marked as removed. Anything it has waiting is closed as a No.', 'Remove')) return;
    change((d) => ops.removeAssistant(d, id));
    if (location.hash.startsWith('#a-')) location.hash = '#assistants';
    toast(`${a.name} was removed. Its history is kept.`);
  },
  'del-rule'(id, el) { change((d) => { const a = d.assistants.find((x) => x.id === id); a.rules = a.rules.filter((r) => r.id !== el.dataset.value); }); },
  'del-trusted'(id, el) { change((d) => { const a = d.assistants.find((x) => x.id === id); a.trusted = a.trusted.filter((v) => v !== el.dataset.value); }); },
  'del-blocked'(id, el) { change((d) => { const a = d.assistants.find((x) => x.id === id); a.blocked = a.blocked.filter((v) => v !== el.dataset.value); }); },
  'end-access'(id, el) {
    change((d) => { const x = d.assistants.find((a) => a.id === id).access.find((c) => c.id === el.dataset.value); if (x) x.expiresAt = new Date().toISOString(); });
    toast('That access has ended.');
  },
  'del-access'(id, el) { change((d) => { const a = d.assistants.find((x) => x.id === id); a.access = a.access.filter((c) => c.id !== el.dataset.value); }); },
  'see-activity'(id) { Object.assign(filters, { tab: 'all', assistant: id, kind: 'all', flagged: false }); location.hash = '#activity'; },
  'add-category'() { openSheet(categoryForm(null)); },
  'edit-category'(id) { openSheet(categoryForm(store.data.categories.find((c) => c.id === id))); },
  async 'del-category'(id) {
    const c = store.data.categories.find((x) => x.id === id);
    if (!c || !await confirmBox(`Remove the ${c.name} category?`, 'Its spending stays in your record and shows under No category.', 'Remove')) return;
    change((d) => { d.categories = d.categories.filter((x) => x.id !== id); });
  },
  'add-subscription'() { openSheet(subscriptionForm(store.data)); },
  async 'del-subscription'(id) {
    const s = store.data.subscriptions.find((x) => x.id === id);
    if (!s || !await confirmBox(`Take ${s.name} off the list?`, 'This only removes it from this list. Nothing is connected yet, so it does not cancel anything real.', 'Take off')) return;
    change((d) => { d.subscriptions = d.subscriptions.filter((x) => x.id !== id); });
  },
  'clear-alerts'() { change((d) => { d.alerts = []; }); },
  'choose-home'() { choosing = true; render(); },
  async 'toggle-demo'() {
    const want = !store.demo;
    closeSheet();
    const ok = await store.setDemo(want);
    if (location.hash.startsWith('#a-')) location.hash = '#assistants';
    toast(!ok ? 'The sample data could not be loaded.' : want ? 'Demo mode is on. This is sample data, not your record.' : 'Demo mode is off. No sample data is left behind.');
  },
  async 'reset-demo'() {
    if (!await confirmBox('Reset the sample data?', 'Everything you changed in Demo mode goes back to the starting sample data. Your own information is not touched.', 'Reset')) return;
    const ok = await store.resetDemo();
    toast(ok ? 'The sample data is back to how it started.' : 'The sample data could not be loaded.');
  },
  'save-copy'() {
    if (store.demo) { toast('Saving a copy is switched off in Demo mode.'); return; }
    download(`assistant-control-panel-${new Date().toISOString().slice(0, 10)}.json`, store.fileText());
    toast('Saved a copy of your information to a file.');
  },
  'load-copy'() {
    if (store.demo) { toast('Loading is switched off in Demo mode.'); return; }
    $('load-file').value = '';
    $('load-file').click();
  },
  async 'erase-my'() {
    if (store.demo) return;
    if (!await confirmBox('Erase all your information?', 'This clears your assistants, limits, rules, lists, settings and history from this browser. It cannot be brought back unless you saved a copy to a file first.', 'Erase everything')) return;
    store.eraseMy();
    location.hash = '';
    toast('Your information was erased from this browser.');
  },
};

// ---- Forms ----------------------------------------------------------------

function quietFrom(f) {
  return { on: f.get('on') === 'on', from: f.get('from'), to: f.get('to'), days: f.getAll('days').map(Number) };
}

const forms = {
  'add-assistant'(f) {
    const name = clean(f.get('name'));
    if (!name) return;
    const a = change((d) => ops.addAssistant(d, name, { perPurchase: num(f.get('perPurchase')), perDay: num(f.get('perDay')), perWeek: num(f.get('perWeek')), perMonth: num(f.get('perMonth')) }));
    closeSheet();
    location.hash = `#a-${a.id}`;
    toast(`${name} was added. Set its rules, lists and quiet hours here.`);
  },
  limits(f, id) {
    change((d) => { d.assistants.find((a) => a.id === id).limits = { perPurchase: num(f.get('perPurchase')), perDay: num(f.get('perDay')), perWeek: num(f.get('perWeek')), perMonth: num(f.get('perMonth')) }; });
    toast('Limits saved.');
  },
  rename(f, id) {
    const name = clean(f.get('name'));
    if (!name) return;
    change((d) => { d.assistants.find((a) => a.id === id).name = name; });
    toast('Name saved.');
  },
  'add-rule'(f, id) {
    const type = f.get('type');
    const value = clean(f.get('value'));
    let rule;
    if (type === 'over') {
      if (num(value) == null) { toast('Type an amount, like 25.'); return; }
      rule = { type, amount: num(value) };
    } else if (type === 'custom') {
      if (!value) { toast('Type the rule in your own words.'); return; }
      rule = { type, text: /^ask me/i.test(value) ? value : `Ask me before ${value}` };
    } else rule = { type };
    change((d) => {
      const a = d.assistants.find((x) => x.id === id);
      if (type !== 'over' && type !== 'custom' && a.rules.some((r) => r.type === type)) return;
      a.rules.push({ id: ops.uid('u'), ...rule });
    });
    toast('Rule added.');
  },
  'add-trusted'(f, id) { listAdd(id, 'trusted', clean(f.get('value'))); },
  'add-blocked'(f, id) { listAdd(id, 'blocked', clean(f.get('value'))); },
  'add-access'(f, id) {
    const kind = f.get('kind');
    const days = Number(f.get('ends')) || 0;
    const label = clean(f.get('label')) || { email: 'Email', calendar: 'Calendar', card: 'Card' }[kind];
    change((d) => {
      d.assistants.find((a) => a.id === id).access.push({
        id: ops.uid('c'), kind, label, ...(days ? { expiresAt: new Date(Date.now() + days * 86400000).toISOString() } : {}),
      });
    });
    toast(days ? `Access added. It shuts off by itself in ${days === 1 ? '1 day' : `${days} days`}.` : 'Access added.');
  },
  quiet(f, id) {
    const q = quietFrom(f);
    change((d) => { if (id === 'all') d.settings.quietHours = q; else d.assistants.find((a) => a.id === id).quietHours = q; });
    toast(q.on ? 'Quiet hours saved.' : 'Quiet hours saved, switched off.');
  },
  category(f) {
    const id = f.get('id');
    const name = clean(f.get('name'));
    if (!name) return;
    const monthlyBudget = num(f.get('monthlyBudget')) || 0;
    change((d) => {
      const c = d.categories.find((x) => x.id === id);
      if (c) Object.assign(c, { name, monthlyBudget }); else d.categories.push({ id: ops.uid('g'), name, monthlyBudget });
    });
    closeSheet();
    toast(id ? 'Category saved.' : 'Category added.');
  },
  subscription(f) {
    const name = clean(f.get('name'));
    if (!name) return;
    change((d) => {
      d.subscriptions.push({ id: ops.uid('s'), assistantId: f.get('assistantId'), name, amount: num(f.get('amount')) || 0, every: f.get('every'), nextAt: new Date(`${f.get('next')}T09:00`).toISOString() });
    });
    closeSheet();
    toast('Added to subscriptions.');
  },
  'add-action'(f) {
    const draft = {
      assistantId: f.get('assistantId'), kind: f.get('kind'), text: clean(f.get('text')), party: clean(f.get('party')),
      amount: num(f.get('amount')) || 0, category: f.get('category') || null, repeats: f.get('repeats') || '',
      undoHours: Number(f.get('undoHours')) || 0, flag: clean(f.get('flag')), ruleIds: f.getAll('ruleIds'),
    };
    if (!draft.text) return;
    const who = (assistant(draft.assistantId) || {}).name || 'It';
    const v = change((d) => ops.submitDraft(d, draft, new Date(), f.get('mode')));
    closeSheet();
    toast(v.outcome === 'blocked' ? `Blocked. ${v.why}`
      : v.outcome === 'paused' ? `Stopped. ${v.why}`
      : v.outcome === 'ask' ? `${who} has to ask. It is in Needs your OK. ${v.why}`
      : v.outcome === 'allowed' ? `Added to Activity. ${v.why}` : v.why);
  },
};

function listAdd(id, key, value) {
  if (!value) return;
  change((d) => {
    const a = d.assistants.find((x) => x.id === id);
    if (!a[key].some((v) => v.toLowerCase() === value.toLowerCase())) a[key].push(value);
  });
  const a = assistant(id);
  const both = a.trusted.some((v) => v.toLowerCase() === value.toLowerCase()) && a.blocked.some((v) => v.toLowerCase() === value.toLowerCase());
  toast(both ? `${value} is on both lists, so it is blocked.` : key === 'trusted' ? `${value} is trusted.` : `${value} is blocked.`);
}

// ---- Wiring ---------------------------------------------------------------

// While the chooser is up, Tab stays inside it and Escape closes it (when
// there is already a home screen to go back to).
document.addEventListener('keydown', (e) => {
  if (!chooserOpen) return;
  if (e.key === 'Escape' && choosing) { choosing = false; render(); return; }
  if (e.key !== 'Tab') return;
  const items = [...$('chooser').querySelectorAll('button')];
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (!$('chooser').contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

document.addEventListener('click', (e) => {
  const homeBtn = e.target.closest('[data-home]');
  if (homeBtn) {
    choosing = false;
    history.replaceState(null, '', location.pathname + location.search);
    store.setHomeScreen(homeBtn.dataset.home);
    return;
  }
  if (e.target.closest('[data-home-cancel]')) { choosing = false; render(); return; }
  const el = e.target.closest('[data-act]');
  if (el) {
    if (el.disabled) return;
    const fn = acts[el.dataset.act];
    if (fn) fn(el.dataset.id, el);
    return;
  }
  if ($('view').dataset.tab === 'activity') onActivityClick(e, render);
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const fn = forms[form.dataset.form];
  if (fn) fn(new FormData(form), form.dataset.id, form);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'load-file') { loadFile(t.files[0]); return; }
  if (t.id === 'add-kind') {
    // An email cannot be taken back, so the undo choice is off for it.
    const undo = t.form.querySelector('#add-undo');
    undo.disabled = t.value === 'emailed';
    if (undo.disabled) undo.value = '0';
    return;
  }
  if (t.id === 'add-assistant') {
    // Show only the written rules that belong to the picked assistant.
    t.form.querySelectorAll('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== t.value; if (el.hidden) el.querySelector('input').checked = false; });
    const box = t.form.querySelector('[data-rules]');
    if (box) box.hidden = !box.querySelector('[data-for]:not([hidden])');
    return;
  }
  if (t.hasAttribute('data-rule-type')) {
    const input = t.form.querySelector('[name="value"]');
    input.hidden = t.value === 'newPerson' || t.value === 'newStore';
    input.placeholder = t.value === 'custom' ? 'booking anything on a weekend' : 'Amount, like 25';
    return;
  }
  if ($('view').dataset.tab === 'activity') onActivityChange(e, render);
});

async function loadFile(file) {
  if (!file || store.demo) return;
  const text = await file.text();
  const body = store.tooNew
    ? 'This browser is holding information from a newer version of this app. Loading this file replaces it for good, and this version cannot save a copy of it first. To keep it, cancel and open the newer version.'
    : 'It replaces the information in this browser now. If you want to keep what is here, cancel and save a copy first.';
  if (store.hasStored && !await confirmBox('Load this saved copy?', body, 'Load it', false)) return;
  const res = store.loadFileText(text);
  if (res.error) { await confirmBox('That file could not be loaded', res.error, 'OK', false); return; }
  toast('Your saved information is loaded.');
}

window.addEventListener('hashchange', () => {
  if (location.hash === '#alerts' && store.data.alerts.some((n) => !n.read)) {
    render(); // show which ones are new, then mark them read for next time
    store.data.alerts.forEach((n) => { n.read = true; });
    store.save();
    window.scrollTo(0, 0);
    return;
  }
  render();
  window.scrollTo(0, 0);
});
store.subscribe(render);

// Quiet hours and expiring access follow the clock, so redraw now and then,
// but never while someone is typing or a form is open.
setInterval(() => {
  const el = document.activeElement;
  const typing = el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
  if (!typing && !$('sheet').open && !$('confirm').open && !chooserOpen) render();
}, 30000);

store.init().then(render);
