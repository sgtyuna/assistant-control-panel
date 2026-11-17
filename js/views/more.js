import { esc } from '../ui.js';
import { HOME_SCREENS } from './first-open.js';

export function renderMore(data, ctx) {
  const home = HOME_SCREENS.find((h) => h.key === ctx.homeScreen);
  return `
    <header class="screen-head"><h1>More</h1></header>
    <div class="stack">
      <section class="card">
        <div class="row">
          <div class="grow">
            <div class="who">Demo mode</div>
            <p class="muted">Shows made-up sample data so you can see every screen. It is kept apart from your own information.</p>
          </div>
          <button class="switch ${ctx.demo ? 'on' : ''}" role="switch" aria-checked="${ctx.demo}" aria-label="Demo mode" data-action="toggle-demo">
            <span class="knob"></span><span class="switch-word">${ctx.demo ? 'On' : 'Off'}</span>
          </button>
        </div>
      </section>
      <section class="card">
        <div class="row">
          <div class="grow">
            <div class="who">Home screen</div>
            <p class="muted">Opens to: <b>${esc(home ? home.name : 'Not chosen yet')}</b></p>
          </div>
          <button class="btn" data-action="choose-home">Change</button>
        </div>
      </section>
      <section class="card">
        <div class="who">Where your information is kept</div>
        <p class="muted">${ctx.storageOk
          ? 'In this browser, on this device. It is never inside the app itself. A browser can clear this storage, so saving a copy to a file (coming in the next stage) is your real backup.'
          : 'This browser will not let the app keep information, so nothing you choose is remembered after you close the page. Try a normal (not private) window.'}</p>
      </section>
      <section class="card">
        <div class="who">Coming in the next stage</div>
        <ul class="plain muted">
          <li>OK and No, Pause Everything and each pause switch</li>
          <li>Assistant detail: limits, rules, trusted and blocked lists, quiet hours, access that expires</li>
          <li>Money, Weekly summary and Settings</li>
          <li>Undo list and phone alerts</li>
          <li>Adding your own assistants, actions and requests</li>
          <li>Saving your information to a file and loading it back</li>
        </ul>
      </section>
    </div>`;
}
