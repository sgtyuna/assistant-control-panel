import { esc, money, when, icon, badge, empty } from '../ui.js';
import { newestFirst } from '../logic.js';

export function renderNeedsOk(data, ctx) {
  const names = Object.fromEntries(data.assistants.map((a) => [a.id, a.name]));
  const list = newestFirst(data.requests);
  if (!list.length) {
    return `<header class="screen-head"><h1>Needs your OK</h1></header>` +
      empty('Nothing is waiting for you',
        'When an assistant has to ask before it buys, books or emails, the request shows up here with OK and No.',
        ctx.emptyExtra);
  }
  const total = list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return `
    <header class="screen-head">
      <h1>Needs your OK</h1>
      <p class="sub"><b class="num">${list.length}</b> waiting · <b class="num">${money(total)}</b> if you OK them all</p>
    </header>
    <div class="grid">
      ${list.map((r) => `
        <article class="card request">
          <div class="row">
            ${badge(names[r.assistantId])}
            <div class="grow">
              <div class="who">${esc(names[r.assistantId] || 'Removed assistant')}</div>
              <div class="muted small">${icon(r.kind)} Asked ${esc(when(r.at))}</div>
            </div>
            <div class="amount num">${Number(r.amount) > 0 ? money(r.amount) : '<span class="muted">No cost</span>'}</div>
          </div>
          <p class="what">${esc(r.text)}</p>
          <p class="why">${icon('flag')}<span><span class="label">Why it asked</span> ${esc(r.why)}</span></p>
          <div class="actions">
            <button class="btn btn-no" data-inert>${icon('x')} No</button>
            <button class="btn btn-ok" data-inert>${icon('check')} OK</button>
          </div>
        </article>`).join('')}
    </div>`;
}
