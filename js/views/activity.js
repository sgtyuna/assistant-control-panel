import { esc, money, when, icon, empty, assistantName } from '../ui.js';
import { newestFirst, undoable } from '../logic.js';

// What is picked in the filters. Kept only while the app is open.
export const filters = { tab: 'all', assistant: 'all', kind: 'all', flagged: false };

const KINDS = [['all', 'All'], ['bought', 'Bought'], ['booked', 'Booked'], ['emailed', 'Emailed']];

// One line of the feed. Also used on the assistant detail screen.
export function itemRow(data, a, now = new Date(), showWho = true) {
  const struck = a.status !== 'done';
  const canUndo = a.status === 'done' && a.undoUntil && new Date(a.undoUntil) > now;
  return `
    <li class="item ${a.flag ? 'is-flagged' : ''} ${struck ? 'is-struck' : ''}">
      <span class="kind">${icon(a.kind)}</span>
      <div class="grow">
        <div class="line">${showWho ? `<b>${esc(assistantName(data, a.assistantId))}</b> ` : ''}<span class="muted small">${esc(when(a.at, now))}</span></div>
        <div class="text">${esc(a.text)}</div>
        ${a.flag ? `<div class="mark mark-flag">${icon('flag')} Unusual: ${esc(a.flag)}</div>` : ''}
        ${a.approved && a.status === 'done' ? `<div class="mark">${icon('check')} You said OK.</div>` : ''}
        ${canUndo ? `<div class="mark mark-undo">${icon('undo')} Can still be undone until ${esc(when(a.undoUntil, now))}
          <button class="btn btn-small" data-act="undo" data-id="${esc(a.id)}">Undo</button></div>` : ''}
        ${a.status === 'undone' ? `<div class="mark">${icon('undo')} Undone. The money is back out of the totals.</div>` : ''}
        ${a.status === 'declined' ? `<div class="mark">${icon('x')} You said No. Nothing was spent.${a.note ? ' ' + esc(a.note) : ''}</div>` : ''}
        ${a.status === 'blocked' ? `<div class="mark mark-stop">${icon('stop')} Blocked. Nothing happened. ${esc(a.note || '')}</div>` : ''}
        ${a.status === 'stopped' ? `<div class="mark mark-stop">${icon('pause')} Stopped. Nothing happened. ${esc(a.note || '')}</div>` : ''}
      </div>
      <div class="amount num">${Number(a.amount) > 0 ? money(a.amount) : ''}</div>
    </li>`;
}

export function renderActivity(data, ctx) {
  const add = ctx.canAdd ? `<button class="btn btn-small" data-act="open-add">${icon('plus')} Add by hand</button>` : '';
  if (!data.actions.length) {
    return `<header class="screen-head"><h1>Activity</h1>${add}</header>` +
      empty('No activity yet',
        'Everything your assistants buy, book or email is listed here in plain English, newest first.',
        ctx.emptyExtra);
  }
  const now = new Date();
  const undo = undoable(data, now);
  const tabs = `
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="${filters.tab === 'all'}" data-filter="tab" data-value="all">Everything</button>
      <button role="tab" aria-selected="${filters.tab === 'undo'}" data-filter="tab" data-value="undo">${icon('undo')} Undo (${undo.length})</button>
    </div>`;

  if (filters.tab === 'undo') {
    return `
      <header class="screen-head"><div><h1>Activity</h1><p class="sub">Recent actions you can still cancel or return</p></div>${add}</header>
      ${tabs}
      ${undo.length ? `<ol class="feed">${undo.map((a) => `
        <li class="item">
          <span class="kind">${icon(a.kind)}</span>
          <div class="grow">
            <div class="line"><b>${esc(assistantName(data, a.assistantId))}</b> <span class="muted small">${esc(when(a.at, now))}</span></div>
            <div class="text">${esc(a.text)}</div>
            <div class="mark mark-undo">${icon('clock')} Undo by ${esc(when(a.undoUntil, now))}</div>
          </div>
          <div class="undo-side"><span class="amount num">${Number(a.amount) > 0 ? money(a.amount) : ''}</span>
            <button class="btn btn-small" data-act="undo" data-id="${esc(a.id)}">${icon('undo')} Undo</button></div>
        </li>`).join('')}</ol>`
      : empty('Nothing can be undone right now', 'Actions that can still be cancelled or returned show up here with their deadline.')}`;
  }

  const list = newestFirst(data.actions).filter((a) =>
    (filters.assistant === 'all' || a.assistantId === filters.assistant) &&
    (filters.kind === 'all' || a.kind === filters.kind) &&
    (!filters.flagged || a.flag));
  const flaggedCount = data.actions.filter((a) => a.flag).length;
  const withHistory = data.assistants.filter((a) => !a.removed || data.actions.some((x) => x.assistantId === a.id));

  return `
    <header class="screen-head">
      <div><h1>Activity</h1>
      <p class="sub"><b class="num">${list.length}</b> of <b class="num">${data.actions.length}</b> shown, newest first</p></div>
      ${add}
    </header>
    ${tabs}
    <div class="filters">
      <label class="sr" for="f-assistant">Assistant</label>
      <select id="f-assistant" data-filter="assistant">
        <option value="all">All assistants</option>
        ${withHistory.map((a) => `<option value="${esc(a.id)}" ${filters.assistant === a.id ? 'selected' : ''}>${esc(a.name)}${a.removed ? ' (removed)' : ''}</option>`).join('')}
      </select>
      <div class="seg" role="group" aria-label="Kind of action">
        ${KINDS.map(([k, label]) => `<button data-filter="kind" data-value="${k}" aria-pressed="${filters.kind === k}">${label}</button>`).join('')}
      </div>
      <button class="toggle" data-filter="flagged" aria-pressed="${filters.flagged}">${icon('flag')} Flagged only (${flaggedCount})</button>
    </div>
    ${list.length ? `<ol class="feed">${list.map((a) => itemRow(data, a, now)).join('')}</ol>`
      : `<div class="empty"><h2>Nothing matches</h2><p>No actions fit these filters.</p><button class="btn" data-filter="clear">Show everything</button></div>`}`;
}

export function onActivityClick(e, rerender) {
  const el = e.target.closest('[data-filter]');
  if (!el || el.tagName === 'SELECT') return;
  const f = el.dataset.filter;
  if (f === 'tab') filters.tab = el.dataset.value;
  if (f === 'kind') filters.kind = el.dataset.value;
  if (f === 'flagged') filters.flagged = !filters.flagged;
  if (f === 'clear') Object.assign(filters, { assistant: 'all', kind: 'all', flagged: false });
  rerender();
}

export function onActivityChange(e, rerender) {
  if (e.target.dataset.filter === 'assistant') { filters.assistant = e.target.value; rerender(); }
}
