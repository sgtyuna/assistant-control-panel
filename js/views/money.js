import { esc, money, moneyRound, dateShort, daysUntil, icon, empty, assistantName } from '../ui.js';
import { categorySpend, totals, nextCharge, monthlySubscriptionCost } from '../logic.js';

export function renderMoney(data, ctx) {
  const now = new Date();
  const t = totals(data, now);
  const spend = categorySpend(data, now);
  const subs = [...data.subscriptions].sort((a, b) => nextCharge(a, now) - nextCharge(b, now));
  const over = data.categories.filter((c) => c.monthlyBudget > 0 && spend[c.id] > c.monthlyBudget).length;

  const catRow = (c) => {
    const used = spend[c.id] || 0;
    const ratio = c.monthlyBudget > 0 ? used / c.monthlyBudget : 0;
    const level = ratio > 1 ? 'over' : ratio >= 0.8 ? 'near' : 'fine';
    return `<li>
      <div class="spend grow">
        <div class="spend-line"><b>${esc(c.name)}</b><span class="num">${money(used)}</span>
          <span class="muted">${c.monthlyBudget > 0 ? `of ${moneyRound(c.monthlyBudget)}` : 'no budget set'}</span>
          ${level === 'over' ? `<span class="tag tag-over">${icon('flag')} Over by ${money(used - c.monthlyBudget)}</span>` : level === 'near' ? '<span class="tag tag-near">Near budget</span>' : ''}</div>
        <div class="bar"><span class="fill fill-${level}" style="width:${Math.min(100, Math.round(ratio * 100))}%"></span></div>
      </div>
      <button class="btn btn-small" data-act="edit-category" data-id="${esc(c.id)}">Change</button>
      <button class="icon-btn" data-act="del-category" data-id="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">${icon('trash')}</button>
    </li>`;
  };

  return `
    <header class="screen-head"><div><h1>Money</h1><p class="sub">Across all assistants${over ? ` · <b>${over}</b> ${over === 1 ? 'category' : 'categories'} over budget` : ''}</p></div></header>
    <div class="tiles">
      <div class="tile"><span class="label">Today</span><span class="num big">${money(t.day)}</span></div>
      <div class="tile"><span class="label">This week</span><span class="num big">${money(t.week)}</span></div>
      <div class="tile"><span class="label">This month</span><span class="num big">${money(t.month)}</span></div>
    </div>
    <section class="card">
      <div class="row"><h2 class="grow">Budget by category, this month</h2>
        <button class="btn btn-small" data-act="add-category">${icon('plus')} Add category</button></div>
      ${data.categories.length ? `<ul class="rows">${data.categories.map(catRow).join('')}
        ${spend[''] > 0 ? `<li><div class="grow spend-line"><b class="muted">No category</b><span class="num">${money(spend[''])}</span></div></li>` : ''}</ul>`
        : empty('No budget categories yet', 'Add categories such as groceries, travel or gifts, each with a monthly budget. Spending in each one is counted here.')}
    </section>
    <section class="card">
      <div class="row"><div class="grow"><h2>Subscriptions</h2>
        <p class="muted small">Every repeating charge an assistant started${subs.length ? ` · about <b class="num">${money(monthlySubscriptionCost(data))}</b> a month` : ''}</p></div>
        ${ctx.canAdd ? `<button class="btn btn-small" data-act="add-subscription">${icon('plus')} Add</button>` : ''}</div>
      ${subs.length ? `<ul class="rows">${subs.map((s) => {
        const next = nextCharge(s, now);
        return `<li>${icon('repeat')}
          <div class="grow"><div><b>${esc(s.name)}</b></div>
            <div class="muted small">Started by ${esc(assistantName(data, s.assistantId))} · next charge ${esc(dateShort(next))} (${esc(daysUntil(next, now))})</div></div>
          <span class="num amount-s">${money(s.amount)}<span class="muted small"> / ${esc(s.every)}</span></span>
          <button class="icon-btn" data-act="del-subscription" data-id="${esc(s.id)}" aria-label="Remove ${esc(s.name)} from the list">${icon('trash')}</button>
        </li>`;
      }).join('')}</ul>`
        : empty('No subscriptions yet', 'When an assistant starts a repeating charge, it is listed here with its next charge date.')}
    </section>`;
}
