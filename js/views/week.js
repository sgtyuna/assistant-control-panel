import { esc, money, moneyRound, dayDate, icon, badge, empty } from '../ui.js';
import { weekSummary } from '../logic.js';

export function renderWeek(data, ctx) {
  const w = weekSummary(data, new Date());
  const last = new Date(w.to); last.setDate(last.getDate() - 1);
  const head = `<header class="screen-head"><div><h1>Weekly summary</h1>
    <p class="sub">${esc(dayDate(w.from))} to ${esc(dayDate(last))} (Sunday through Saturday)</p></div></header>`;
  if (!w.rows.length) return head + empty('Nothing to sum up yet', 'Each week, this shows what every assistant did and spent.', ctx.emptyExtra);
  const stat = (n, label) => `<div class="stat ${n ? '' : 'zero'}"><span class="num">${n}</span><span>${label}</span></div>`;
  return `${head}
    <div class="tiles">
      <div class="tile"><span class="label">Spent this week</span><span class="num big">${money(w.spent)}</span></div>
      <div class="tile"><span class="label">Actions</span><span class="num big">${w.rows.reduce((s, r) => s + r.bought + r.booked + r.emailed, 0)}</span></div>
      <div class="tile"><span class="label">Flagged</span><span class="num big">${w.rows.reduce((s, r) => s + r.flagged, 0)}</span></div>
    </div>
    <div class="grid">
      ${w.rows.sort((a, b) => b.spent - a.spent || b.total - a.total).map((r) => {
        const ratio = r.limit > 0 ? r.spent / r.limit : 0;
        const level = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'near' : 'fine';
        return `<article class="card">
          <div class="row">${badge(r.assistant.name)}
            <div class="grow"><a class="who" href="#a-${esc(r.assistant.id)}">${esc(r.assistant.name)}</a>
              ${r.assistant.removed ? `<div class="state state-off">${icon('x')} Removed</div>` : ''}</div>
            <div class="amount num">${money(r.spent)}</div></div>
          <div class="spend"><div class="spend-line"><span class="muted">${r.limit > 0 ? `of its ${moneyRound(r.limit)} weekly limit` : 'no weekly limit'}</span>
            ${level !== 'fine' ? `<span class="tag tag-${level}">${level === 'over' ? 'At limit' : 'Near limit'}</span>` : ''}</div>
            <div class="bar"><span class="fill fill-${level}" style="width:${Math.min(100, Math.round(ratio * 100))}%"></span></div></div>
          ${r.total || r.waiting ? `<div class="stats">
            ${stat(r.bought, 'bought')}${stat(r.booked, 'booked')}${stat(r.emailed, 'emailed')}
            ${stat(r.flagged, 'flagged')}${stat(r.approved, 'you OK’d')}${stat(r.declined, 'you said No')}
            ${stat(r.undone, 'undone')}${stat(r.held, 'blocked or stopped')}${stat(r.waiting, 'waiting now')}
          </div>` : '<p class="muted">Did nothing this week.</p>'}
        </article>`;
      }).join('')}
    </div>`;
}
