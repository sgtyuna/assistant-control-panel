import { esc, money, moneyRound, when, daysUntil, icon, badge, empty } from '../ui.js';
import { spending, lastAction, soonestExpiry } from '../logic.js';

function card(data, a) {
  const rows = spending(data, a);
  const month = rows.find((r) => r.key === 'month');
  const tight = rows.filter((r) => r.key !== 'month' && r.limit > 0 && r.ratio >= 0.8).sort((x, y) => y.ratio - x.ratio)[0];
  const level = month.ratio >= 1 ? 'over' : month.ratio >= 0.8 ? 'near' : 'fine';
  const last = lastAction(data, a.id);
  const exp = soonestExpiry(a);
  const waiting = data.requests.filter((r) => r.assistantId === a.id).length;
  const chips = [
    waiting ? `<span class="chip chip-info">${icon('ok')} ${waiting} waiting for your OK</span>` : '',
    tight ? `<span class="chip chip-warn">${icon('flag')} ${tight.ratio >= 1 ? 'Over' : 'Near'} ${tight.word} limit: ${moneyRound(tight.spent)} of ${moneyRound(tight.limit)}</span>` : '',
    exp ? `<span class="chip chip-warn">${icon('clock')} ${esc(exp.label.split(',')[0])} access ends ${esc(daysUntil(exp.expiresAt))}</span>` : '',
  ].join('');
  return `
    <article class="card assistant ${a.paused ? 'is-paused' : ''}">
      <div class="row">
        ${badge(a.name)}
        <div class="grow">
          <div class="who">${esc(a.name)}</div>
          <div class="state ${a.paused ? 'state-paused' : 'state-on'}">${a.paused ? `${icon('pause')} Paused` : `${icon('check')} On`}</div>
        </div>
        <button class="switch ${a.paused ? '' : 'on'}" role="switch" aria-checked="${a.paused ? 'false' : 'true'}"
          aria-label="${esc(a.name)}: ${a.paused ? 'paused, switch on' : 'on, pause'}" data-inert>
          <span class="knob"></span><span class="switch-word">${a.paused ? 'Paused' : 'On'}</span>
        </button>
      </div>
      <div class="spend">
        <div class="spend-line">
          <span class="num big">${money(month.spent)}</span>
          <span class="muted">of ${month.limit > 0 ? moneyRound(month.limit) : 'no limit'} this month</span>
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
    </article>`;
}

export function renderAssistants(data, ctx) {
  const list = data.assistants.filter((a) => !a.removed);
  const add = `
    <button class="card add-card" data-inert>
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
  const paused = list.filter((a) => a.paused).length;
  return `
    <header class="screen-head">
      <h1>Assistants</h1>
      <p class="sub"><b class="num">${list.length - paused}</b> on · <b class="num">${paused}</b> paused</p>
    </header>
    <div class="grid">${list.map((a) => card(data, a)).join('')}${add}</div>`;
}
