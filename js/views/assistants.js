import { esc, money, moneyRound, when, daysUntil, icon, badge, empty, statePill, pauseSwitch } from '../ui.js';
import { spending, lastAction, soonestExpiry, stateOf } from '../logic.js';

function card(data, a) {
  const rows = spending(data, a);
  const month = rows.find((r) => r.key === 'month');
  const tight = rows.filter((r) => r.key !== 'month' && r.limit > 0 && r.ratio >= 0.8).sort((x, y) => y.ratio - x.ratio)[0];
  const level = month.ratio >= 1 ? 'over' : month.ratio >= 0.8 ? 'near' : 'fine';
  const last = lastAction(data, a.id);
  const exp = soonestExpiry(a);
  const waiting = data.requests.filter((r) => r.assistantId === a.id).length;
  const st = stateOf(data, a);
  const chips = [
    waiting ? `<a class="chip chip-info" href="#ok">${icon('ok')} ${waiting} waiting for your OK</a>` : '',
    tight ? `<span class="chip chip-warn">${icon('flag')} ${tight.ratio >= 1 ? 'At' : 'Near'} ${tight.word} limit: ${moneyRound(tight.spent)} of ${moneyRound(tight.limit)}</span>` : '',
    exp ? `<span class="chip chip-warn">${icon('clock')} ${esc(exp.label.split(',')[0])} access ends ${esc(daysUntil(exp.expiresAt))}</span>` : '',
  ].join('');
  return `
    <article class="card assistant is-${st.key}">
      <div class="row">
        ${badge(a.name)}
        <div class="grow">
          <a class="who" href="#a-${esc(a.id)}">${esc(a.name)}</a>
          <div class="states">${statePill(data, a)}</div>
        </div>
        ${pauseSwitch(a)}
      </div>
      <div class="spend">
        <div class="spend-line">
          <span class="num big">${money(month.spent)}</span>
          <span class="muted">${month.limit > 0 ? `of ${moneyRound(month.limit)} this month` : 'this month, no monthly limit'}</span>
          ${level !== 'fine' ? `<span class="tag tag-${level}">${level === 'over' ? 'Over limit' : 'Near limit'}</span>` : ''}
        </div>
        <div class="bar" role="img" aria-label="${Math.round(month.ratio * 100)} percent of the monthly limit used">
          <span class="fill fill-${level}" style="width:${Math.min(100, Math.round(month.ratio * 100))}%"></span>
        </div>
      </div>
      ${chips ? `<div class="chips">${chips}</div>` : ''}
      <div class="last">
        <span class="label">Last action</span>
        ${last ? `<span>${icon(last.kind)} ${esc(last.text)}</span><span class="muted small">${esc(when(last.at))}</span>` : '<span class="muted">Nothing yet</span>'}
      </div>
      <a class="btn btn-small" href="#a-${esc(a.id)}">Limits, rules and history ${icon('next')}</a>
    </article>`;
}

export function renderAssistants(data, ctx) {
  const list = data.assistants.filter((a) => !a.removed);
  const add = `
    <button class="card add-card" data-act="open-add-assistant">
      ${icon('plus')}
      <span class="who">Add your own</span>
      <span class="muted small">Name an assistant and set its limits</span>
    </button>`;
  if (!list.length) {
    return `<header class="screen-head"><h1>Assistants</h1></header>` +
      empty('No assistants yet',
        'Each assistant you add gets a card here with its pause switch, its spending against its limit, and the last thing it did.',
        ctx.emptyExtra);
  }
  const on = list.filter((a) => stateOf(data, a).key === 'on').length;
  return `
    <header class="screen-head">
      <h1>Assistants</h1>
      <p class="sub"><b class="num">${on}</b> on · <b class="num">${list.length - on}</b> paused or quiet</p>
    </header>
    <div class="grid">${list.map((a) => card(data, a)).join('')}${add}</div>`;
}
