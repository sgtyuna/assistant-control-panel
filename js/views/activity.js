import { esc, money, when, icon, empty } from '../ui.js';
import { newestFirst } from '../logic.js';

// What is picked in the filters. Kept only while the app is open.
export const filters = { assistant: 'all', kind: 'all', flagged: false };

const KINDS = [['all', 'All'], ['bought', 'Bought'], ['booked', 'Booked'], ['emailed', 'Emailed']];

export function renderActivity(data, ctx) {
  if (!data.actions.length) {
    return `<header class="screen-head"><h1>Activity</h1></header>` +
      empty('No activity yet',
        'Everything your assistants buy, book or email is listed here in plain English, newest first.',
        ctx.emptyExtra);
  }
  const names = Object.fromEntries(data.assistants.map((a) => [a.id, a.name]));
  const list = newestFirst(data.actions).filter((a) =>
    (filters.assistant === 'all' || a.assistantId === filters.assistant) &&
    (filters.kind === 'all' || a.kind === filters.kind) &&
    (!filters.flagged || a.flag));
  const flaggedCount = data.actions.filter((a) => a.flag).length;

  return `
    <header class="screen-head">
      <h1>Activity</h1>
      <p class="sub"><b class="num">${list.length}</b> of <b class="num">${data.actions.length}</b> shown, newest first</p>
    </header>
    <div class="filters">
      <label class="sr" for="f-assistant">Assistant</label>
      <select id="f-assistant" data-filter="assistant">
        <option value="all">All assistants</option>
        ${data.assistants.map((a) => `<option value="${esc(a.id)}" ${filters.assistant === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}
      </select>
      <div class="seg" role="group" aria-label="Kind of action">
        ${KINDS.map(([k, label]) => `<button data-filter="kind" data-value="${k}" aria-pressed="${filters.kind === k}">${label}</button>`).join('')}
      </div>
      <button class="toggle" data-filter="flagged" aria-pressed="${filters.flagged}">${icon('flag')} Flagged only (${flaggedCount})</button>
    </div>
    ${list.length ? `<ol class="feed">
      ${list.map((a) => {
        const struck = a.status !== 'done';
        return `
        <li class="item ${a.flag ? 'is-flagged' : ''} ${struck ? 'is-struck' : ''}">
          <span class="kind">${icon(a.kind)}</span>
          <div class="grow">
            <div class="line"><b>${esc(names[a.assistantId] || 'Removed assistant')}</b> <span class="muted small">${esc(when(a.at))}</span></div>
            <div class="text">${esc(a.text)}</div>
            ${a.flag ? `<div class="mark mark-flag">${icon('flag')} Unusual: ${esc(a.flag)}</div>` : ''}
            ${a.status === 'undone' ? `<div class="mark">${icon('undo')} Undone. The money is back out of the totals.</div>` : ''}
            ${a.status === 'declined' ? `<div class="mark">${icon('x')} You said No. Nothing was spent.</div>` : ''}
          </div>
          <div class="amount num">${Number(a.amount) > 0 ? money(a.amount) : ''}</div>
        </li>`;
      }).join('')}
    </ol>` : `<div class="empty"><h2>Nothing matches</h2><p>No actions fit these filters.</p><button class="btn" data-filter="clear">Show everything</button></div>`}`;
}

export function onActivityClick(e, rerender) {
  const el = e.target.closest('[data-filter]');
  if (!el || el.tagName === 'SELECT') return;
  const f = el.dataset.filter;
  if (f === 'kind') filters.kind = el.dataset.value;
  if (f === 'flagged') filters.flagged = !filters.flagged;
  if (f === 'clear') Object.assign(filters, { assistant: 'all', kind: 'all', flagged: false });
  rerender();
}

export function onActivityChange(e, rerender) {
  if (e.target.dataset.filter === 'assistant') { filters.assistant = e.target.value; rerender(); }
}
