import { esc, money, when, icon, badge, empty, assistantName } from '../ui.js';
import { newestFirst } from '../logic.js';

export function renderNeedsOk(data, ctx) {
  const list = newestFirst(data.requests);
  const add = ctx.canAdd ? `<button class="btn btn-small" data-act="open-add" data-mode="ask">${icon('plus')} Add by hand</button>` : '';
  if (!list.length) {
    return `<header class="screen-head"><h1>Needs your OK</h1>${add}</header>` +
      empty('Nothing is waiting for you',
        'When an assistant has to ask before it buys, books or emails, the request shows up here with OK and No.',
        ctx.emptyExtra);
  }
  const total = list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return `
    <header class="screen-head">
      <div><h1>Needs your OK</h1>
      <p class="sub"><b class="num">${list.length}</b> waiting · <b class="num">${money(total)}</b> if you OK them all</p></div>
      ${add}
    </header>
    <div class="grid">
      ${list.map((r) => `
        <article class="card request">
          <div class="row">
            ${badge(assistantName(data, r.assistantId))}
            <div class="grow">
              <div class="who">${esc(assistantName(data, r.assistantId))}</div>
              <div class="muted small">${icon(r.kind)} Asked ${esc(when(r.at))}</div>
            </div>
            <div class="amount num">${Number(r.amount) > 0 ? money(r.amount) : '<span class="muted">No cost</span>'}</div>
          </div>
          <p class="what">${esc(r.text)}</p>
          ${r.repeats ? `<p class="muted small">${icon('repeat')} Repeats every ${esc(r.repeats)}</p>` : ''}
          <p class="why">${icon('flag')}<span><span class="label">Why it asked</span> ${esc(r.why)}</span></p>
          <div class="actions">
            <button class="btn btn-no" data-act="decline" data-id="${esc(r.id)}">${icon('x')} No</button>
            <button class="btn btn-ok" data-act="approve" data-id="${esc(r.id)}">${icon('check')} OK</button>
          </div>
        </article>`).join('')}
    </div>`;
}
