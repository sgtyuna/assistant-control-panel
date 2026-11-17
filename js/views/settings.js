import { esc, icon, statePill } from '../ui.js';
import { HOME_SCREENS } from './first-open.js';
import { quietFields } from './forms.js';

export function renderSettings(data, ctx) {
  const home = HOME_SCREENS.find((h) => h.key === ctx.homeScreen);
  const live = data.assistants.filter((a) => !a.removed);
  const gone = data.assistants.filter((a) => a.removed);
  const off = ctx.demo ? 'disabled' : '';
  return `
    <header class="screen-head"><h1>Settings</h1></header>
    <div class="stack">
      <section class="card">
        <div class="row"><div class="grow"><h2>Home screen</h2>
          <p class="muted">Opens to: <b>${esc(home ? home.name : 'Not chosen yet')}</b></p></div>
          <button class="btn" data-act="choose-home">Change</button></div>
      </section>

      <section class="card">
        <h2>Quiet hours for all assistants</h2>
        <p class="muted small">Every assistant pauses on this schedule, then switches back on. Each assistant can also have its own.</p>
        <form data-form="quiet" data-id="all" class="stack-s">
          ${quietFields(data.settings.quietHours, 'gq')}
          <button class="btn btn-small">Save quiet hours</button>
        </form>
      </section>

      <section class="card">
        <div class="row"><h2 class="grow">Assistants</h2>
          <button class="btn btn-small" data-act="open-add-assistant">${icon('plus')} Add</button></div>
        ${live.length ? `<ul class="rows">${live.map((a) => `
          <li><div class="grow"><a class="who" href="#a-${esc(a.id)}">${esc(a.name)}</a><div class="states">${statePill(data, a)}</div></div>
            <button class="btn btn-small btn-danger" data-act="remove-assistant" data-id="${esc(a.id)}">Remove</button></li>`).join('')}</ul>`
          : '<p class="muted">No assistants yet.</p>'}
        ${gone.length ? `<p class="label">Removed (history kept)</p><ul class="rows">${gone.map((a) => `
          <li><div class="grow"><a class="who" href="#a-${esc(a.id)}">${esc(a.name)}</a><div class="state state-off">${icon('x')} Removed</div></div></li>`).join('')}</ul>` : ''}
      </section>

      <section class="card">
        <h2>Your information</h2>
        <p class="muted">${ctx.storageOk
          ? 'Kept in this browser, on this device. It is never inside the app itself. A browser can clear this storage, so saving a copy to a file is your real backup.'
          : 'This browser will not let the app keep information, so nothing is remembered after you close the page. Try a normal (not private) window.'}</p>
        ${ctx.demo ? `<p class="why">${icon('flag')}<span>Saving, loading and erasing are switched off in Demo mode, so sample data can never be mistaken for your record. Turn Demo mode off to use them.</span></p>` : ''}
        <div class="btn-row">
          <button class="btn" data-act="save-copy" ${off}>Save a copy to a file</button>
          <button class="btn" data-act="load-copy" ${off}>Load a saved copy</button>
          <button class="btn btn-danger" data-act="erase-my" ${off}>Erase my information</button>
        </div>
        <p class="muted small">The saved copy is one file with everything in it: assistants, limits, rules, lists, quiet hours, settings and history. File version ${ctx.version}.</p>
      </section>

      <section class="card">
        <div class="row"><div class="grow"><h2>Demo mode</h2>
          <p class="muted">Shows made-up sample data so you can try every screen. It is kept apart from your own information, and turning it off leaves none behind.</p></div>
          <button class="switch ${ctx.demo ? 'on' : ''}" role="switch" aria-checked="${ctx.demo}" aria-label="Demo mode" data-act="toggle-demo">
            <span class="knob"></span><span class="switch-word">${ctx.demo ? 'On' : 'Off'}</span></button></div>
        ${ctx.demo ? '<button class="btn btn-small" data-act="reset-demo">Reset to the starting sample data</button>' : ''}
      </section>
    </div>`;
}
