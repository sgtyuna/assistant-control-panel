import { esc, when, icon, empty } from '../ui.js';

const ICON = { ask: 'ok', flag: 'flag', blocked: 'stop', stopped: 'pause', expire: 'clock' };

export function renderAlerts(data) {
  const head = `<header class="screen-head"><div><h1>Alerts</h1>
    <p class="sub">In this version, phone alerts show up here inside the app</p></div>
    ${data.alerts.length ? '<button class="btn btn-small" data-act="clear-alerts">Clear all</button>' : ''}</header>`;
  if (!data.alerts.length) {
    return head + empty('No alerts yet', 'You get an alert when an assistant needs your OK, when something unusual is flagged, and when something is blocked or stopped.');
  }
  return `${head}
    <ol class="feed">${data.alerts.map((n) => `
      <li class="item ${n.read ? '' : 'is-new'}">
        <span class="kind">${icon(ICON[n.kind] || 'alerts')}</span>
        <div class="grow"><div class="text">${esc(n.text)}</div><div class="muted small">${esc(when(n.at))}${n.read ? '' : ' · <b class="new-word">New</b>'}</div></div>
      </li>`).join('')}</ol>`;
}
