import { store } from './store.js';
import { icon, toast, NOT_YET } from './ui.js';
import { renderNeedsOk } from './views/needs-ok.js';
import { renderAssistants } from './views/assistants.js';
import { renderActivity, onActivityClick, onActivityChange } from './views/activity.js';
import { renderMore } from './views/more.js';
import { renderFirstOpen } from './views/first-open.js';

const TABS = [
  { key: 'ok', label: 'Needs OK', render: renderNeedsOk },
  { key: 'assistants', label: 'Assistants', render: renderAssistants },
  { key: 'activity', label: 'Activity', render: renderActivity },
  { key: 'more', label: 'More', render: renderMore },
];

const $ = (id) => document.getElementById(id);
let choosing = false; // true while the home screen chooser is open from More
let chooserOpen = false; // was the chooser showing after the last render

function currentTab() {
  const key = location.hash.replace('#', '');
  return TABS.find((t) => t.key === key) || TABS.find((t) => t.key === store.my.settings.homeScreen) || TABS[0];
}

function render() {
  const home = store.my.settings.homeScreen;
  const data = store.data;

  // First open: nothing else shows until a home screen is picked.
  const showChooser = !home || choosing;
  $('chooser').innerHTML = showChooser ? renderFirstOpen(home) : '';
  $('shell').hidden = !home;
  $('shell').inert = showChooser; // nothing behind the chooser can be tabbed to
  if (showChooser && !chooserOpen) {
    // Just opened: move the keyboard into it.
    const first = $('chooser').querySelector('.choice.is-current') || $('chooser').querySelector('.choice');
    if (first) first.focus();
  }
  const justClosed = chooserOpen && !showChooser;
  chooserOpen = showChooser;
  if (!home) return;

  const tab = currentTab();
  const ctx = {
    demo: store.demo,
    homeScreen: home,
    storageOk: store.storageOk,
    emptyExtra: store.demo ? '' : `
      <p class="muted small">Adding your own comes in the next stage. Until then, Demo mode shows how it looks with sample data.</p>
      <button class="btn btn-primary" data-action="toggle-demo">Turn on Demo mode</button>`,
  };
  $('view').innerHTML = tab.render(data, ctx);
  $('view').dataset.tab = tab.key;

  $('demo-strip').hidden = !store.demo;
  $('notice').hidden = store.storageOk && !store.tooNew;
  $('notice').textContent = store.tooNew
    ? 'Your saved information was made by a newer version of this app, so this version cannot open it. Nothing was changed. Update the app to see it.'
    : 'This browser will not let the app keep information. Nothing you choose will be remembered after you close the page.';

  const waiting = data.requests.length;
  $('nav').innerHTML = TABS.map((t) => `
    <a href="#${t.key}" class="${t.key === tab.key ? 'is-active' : ''}" ${t.key === tab.key ? 'aria-current="page"' : ''}>
      ${icon(t.key)}<span>${t.label}</span>
      ${t.key === 'ok' && waiting ? `<b class="count" aria-label="${waiting} waiting">${waiting}</b>` : ''}
    </a>`).join('');

  if (justClosed) {
    // Put the keyboard back where it was (the Change button), or on the screen.
    const back = $('view').querySelector('[data-action="choose-home"]') || $('nav').querySelector('.is-active');
    if (back) back.focus();
  }
}

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

document.addEventListener('click', async (e) => {
  const homeBtn = e.target.closest('[data-home]');
  if (homeBtn) {
    choosing = false;
    history.replaceState(null, '', location.pathname + location.search);
    store.setHomeScreen(homeBtn.dataset.home);
    return;
  }
  if (e.target.closest('[data-home-cancel]')) { choosing = false; render(); return; }

  const act = e.target.closest('[data-action]');
  if (act) {
    if (act.dataset.action === 'toggle-demo') {
      const want = !store.demo;
      const ok = await store.setDemo(want);
      toast(!ok ? 'The sample data could not be loaded.' : want ? 'Demo mode is on. This is sample data.' : 'Demo mode is off. No sample data is left behind.');
    }
    if (act.dataset.action === 'choose-home') { choosing = true; render(); }
    return;
  }
  if (e.target.closest('[data-inert]')) { toast(NOT_YET); return; }
  if ($('view').dataset.tab === 'activity') onActivityClick(e, render);
});

document.addEventListener('change', (e) => {
  if ($('view').dataset.tab === 'activity') onActivityChange(e, render);
});

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
store.subscribe(render);

$('pause-all').innerHTML = `${icon('pause')}<span>Pause Everything</span>`;
store.init().then(render);
