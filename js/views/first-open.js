import { esc } from '../ui.js';

export const HOME_SCREENS = [
  { key: 'ok', name: 'Needs your OK', blurb: 'Things waiting for your approval, each with OK and No.' },
  { key: 'assistants', name: 'Assistant cards', blurb: 'One card per assistant: its switch, its spending, its last action.' },
  { key: 'activity', name: 'Activity feed', blurb: 'Everything every assistant did, newest first.' },
];

// Small drawn previews. Shapes only, so no sample data is baked into the shell.
const PREVIEWS = {
  ok: `
    <div class="pv-card"><i class="pv-dot"></i><i class="pv-bar w60"></i><i class="pv-num"></i>
      <div class="pv-btns"><i class="pv-btn no"></i><i class="pv-btn ok"></i></div></div>
    <div class="pv-card"><i class="pv-dot"></i><i class="pv-bar w45"></i><i class="pv-num"></i>
      <div class="pv-btns"><i class="pv-btn no"></i><i class="pv-btn ok"></i></div></div>`,
  assistants: `
    <div class="pv-two">
      <div class="pv-card"><i class="pv-dot"></i><i class="pv-switch on"></i><i class="pv-meter"><b style="width:40%"></b></i></div>
      <div class="pv-card"><i class="pv-dot"></i><i class="pv-switch"></i><i class="pv-meter"><b class="warn" style="width:88%"></b></i></div>
      <div class="pv-card"><i class="pv-dot"></i><i class="pv-switch on"></i><i class="pv-meter"><b style="width:62%"></b></i></div>
      <div class="pv-card"><i class="pv-dot"></i><i class="pv-switch on"></i><i class="pv-meter"><b style="width:20%"></b></i></div>
    </div>`,
  activity: `
    <div class="pv-rows">
      <div class="pv-row"><i class="pv-dot sm"></i><i class="pv-bar w60"></i><i class="pv-num sm"></i></div>
      <div class="pv-row"><i class="pv-dot sm"></i><i class="pv-bar w45"></i><i class="pv-num sm"></i></div>
      <div class="pv-row flag"><i class="pv-dot sm"></i><i class="pv-bar w70"></i><i class="pv-num sm"></i></div>
      <div class="pv-row"><i class="pv-dot sm"></i><i class="pv-bar w30"></i><i class="pv-num sm"></i></div>
      <div class="pv-row"><i class="pv-dot sm"></i><i class="pv-bar w60"></i><i class="pv-num sm"></i></div>
    </div>`,
};

export function renderFirstOpen(current) {
  return `
    <div class="chooser" role="dialog" aria-modal="true" aria-labelledby="chooser-title">
      <div class="chooser-inner">
        <p class="eyebrow">Assistant Control Panel</p>
        <h1 id="chooser-title">${current ? 'Change your home screen' : 'Which screen should open first?'}</h1>
        <p class="muted">Tap one. You can change it any time.</p>
        <div class="choices">
          ${HOME_SCREENS.map((h) => `
            <button class="choice ${current === h.key ? 'is-current' : ''}" data-home="${h.key}">
              <span class="pv" aria-hidden="true">${PREVIEWS[h.key]}</span>
              <span class="choice-name">${esc(h.name)}${current === h.key ? ' <em>(current)</em>' : ''}</span>
              <span class="muted small">${esc(h.blurb)}</span>
            </button>`).join('')}
        </div>
        ${current ? '<button class="btn" data-home-cancel>Keep it as it is</button>' : ''}
      </div>
    </div>`;
}
