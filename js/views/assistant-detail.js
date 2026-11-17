import { esc, money, moneyRound, when, daysUntil, dateShort, icon, badge, statePill, pauseSwitch, empty } from '../ui.js';
import { spending, ruleText, accessLive, newestFirst, isBlocked, isTrusted } from '../logic.js';
import { limitFields, quietFields } from './forms.js';
import { itemRow } from './activity.js';

const chipList = (a, key, items, other, note) => items.length ? `<ul class="pills">${items.map((v) => `
  <li><span>${esc(v)}${other(a, v) ? ` <em>${note}</em>` : ''}</span>
    <button class="icon-btn" data-act="del-${key}" data-id="${esc(a.id)}" data-value="${esc(v)}" aria-label="Remove ${esc(v)}">${icon('x')}</button></li>`).join('')}</ul>`
  : '<p class="muted">Nobody yet.</p>';

export function renderDetail(data, ctx, id) {
  const a = data.assistants.find((x) => x.id === id);
  const back = `<a class="back" href="#assistants">${icon('back')} Assistants</a>`;
  if (!a) return back + empty('That assistant is not here', 'It may belong to your other space (Demo mode or your own information).');
  const now = new Date();
  const rows = spending(data, a, now);
  const history = newestFirst(data.actions.filter((x) => x.assistantId === a.id));
  const sid = esc(a.id);

  if (a.removed) {
    return `${back}
      <header class="detail-head"><div class="row">${badge(a.name)}<div class="grow"><h1>${esc(a.name)}</h1><div class="states">${statePill(data, a)}</div></div></div></header>
      <p class="muted">Removed ${esc(when(a.removedAt, now))}. Its history stays in your record.</p>
      <section class="card"><h2>History</h2>${history.length ? `<ol class="feed flat">${history.map((x) => itemRow(data, x, now, false)).join('')}</ol>` : '<p class="muted">Nothing yet.</p>'}</section>`;
  }

  return `${back}
    <header class="detail-head">
      <div class="row">${badge(a.name)}
        <div class="grow"><h1>${esc(a.name)}</h1><div class="states">${statePill(data, a)}</div></div>
        ${pauseSwitch(a)}
      </div>
    </header>
    <div class="grid detail">
      <section class="card">
        <h2>Spending against its limits</h2>
        ${rows.map((r) => {
          const level = r.ratio >= 1 ? 'over' : r.ratio >= 0.8 ? 'near' : 'fine';
          return `<div class="spend">
            <div class="spend-line"><span class="label">${r.label}</span><span class="num">${money(r.spent)}</span>
              <span class="muted">${r.limit > 0 ? `of ${moneyRound(r.limit)}` : 'no limit'}</span>
              ${level !== 'fine' ? `<span class="tag tag-${level}">${level === 'over' ? 'At limit' : 'Near limit'}</span>` : ''}</div>
            <div class="bar"><span class="fill fill-${level}" style="width:${Math.min(100, Math.round(r.ratio * 100))}%"></span></div>
          </div>`;
        }).join('')}
        <form data-form="limits" data-id="${sid}" class="stack-s">
          <p class="label">Change its limits (blank means no limit)</p>
          ${limitFields(a.limits)}
          <button class="btn btn-small">Save limits</button>
        </form>
      </section>

      <section class="card">
        <h2>Approve-first rules</h2>
        <p class="muted small">It has to ask you first when one of these applies. Going over a spending limit always asks.</p>
        ${a.rules.length ? `<ul class="pills col">${a.rules.map((r) => `
          <li><span>${esc(ruleText(r))}</span>
            <button class="icon-btn" data-act="del-rule" data-id="${sid}" data-value="${esc(r.id)}" aria-label="Remove rule">${icon('x')}</button></li>`).join('')}</ul>`
          : '<p class="muted">No rules yet.</p>'}
        <form data-form="add-rule" data-id="${sid}" class="inline-form">
          <select name="type" id="rule-type" aria-label="Kind of rule" data-rule-type>
            <option value="over">Ask me before anything over…</option>
            <option value="newPerson">Ask me before emailing someone new</option>
            <option value="newStore">Ask me before a new store</option>
            <option value="custom">My own words…</option>
          </select>
          <input name="value" id="rule-value" aria-label="Amount or rule" placeholder="Amount, like 25" autocomplete="off">
          <button class="btn btn-small">${icon('plus')} Add rule</button>
        </form>
      </section>

      <section class="card">
        <h2>Trusted list</h2>
        <p class="muted small">Stores and people it may use without asking as someone new. Limits and rules still apply.</p>
        ${chipList(a, 'trusted', a.trusted, isBlocked, '(also blocked, so blocked wins)')}
        <form data-form="add-trusted" data-id="${sid}" class="inline-form">
          <input name="value" id="trusted-value" aria-label="Store or person to trust" placeholder="Store or person" required maxlength="60" autocomplete="off">
          <button class="btn btn-small">${icon('plus')} Trust</button>
        </form>
        <h2>Blocked list</h2>
        <p class="muted small">Stores and people it may never use. Blocked beats everything.</p>
        ${chipList(a, 'blocked', a.blocked, isTrusted, '(also trusted, but blocked wins)')}
        <form data-form="add-blocked" data-id="${sid}" class="inline-form">
          <input name="value" id="blocked-value" aria-label="Store or person to block" placeholder="Store or person" required maxlength="60" autocomplete="off">
          <button class="btn btn-small">${icon('plus')} Block</button>
        </form>
      </section>

      <section class="card">
        <h2>What it can reach</h2>
        ${a.access.length ? `<ul class="rows">${a.access.map((x) => {
          const live = accessLive(x, now);
          return `<li class="${live ? '' : 'is-ended'}">${icon(x.kind)}
            <div class="grow"><div>${esc(x.label)}</div>
              <div class="small ${live && x.expiresAt ? 'warn-text' : 'muted'}">${!live ? `${icon('x')} Ended ${esc(dateShort(x.expiresAt))}. Shut off by itself.`
                : x.expiresAt ? `${icon('clock')} Ends ${esc(daysUntil(x.expiresAt, now))} (${esc(when(x.expiresAt, now))})` : 'No end date'}</div></div>
            ${live ? `<button class="btn btn-small" data-act="end-access" data-id="${sid}" data-value="${esc(x.id)}">End now</button>`
              : `<button class="icon-btn" data-act="del-access" data-id="${sid}" data-value="${esc(x.id)}" aria-label="Remove from list">${icon('trash')}</button>`}
          </li>`;
        }).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}
        <form data-form="add-access" data-id="${sid}" class="stack-s">
          <div class="fields three">
            <label class="field"><span>Kind</span><select name="kind" id="access-kind"><option value="email">Email</option><option value="calendar">Calendar</option><option value="card">Card</option></select></label>
            <label class="field"><span>Label</span><input name="label" id="access-label" placeholder="Card ending 1234" maxlength="60" autocomplete="off"></label>
            <label class="field"><span>Shuts off</span><select name="ends" id="access-ends">
              <option value="">Never</option><option value="1">In 1 day</option><option value="7">In 1 week</option><option value="30">In 30 days</option></select></label>
          </div>
          <p class="muted small">For one task, add it and tap End now when the task is done.</p>
          <button class="btn btn-small">${icon('plus')} Add access</button>
        </form>
      </section>

      <section class="card">
        <h2>Its quiet hours</h2>
        <p class="muted small">It pauses on this schedule, then switches back on. The hours for all assistants (in Settings) apply too.</p>
        <form data-form="quiet" data-id="${sid}" class="stack-s">
          ${quietFields(a.quietHours, 'aq')}
          <button class="btn btn-small">Save quiet hours</button>
        </form>
      </section>

      <section class="card">
        <div class="row"><h2 class="grow">History</h2>
          <button class="btn btn-small" data-act="open-add" data-id="${sid}">${icon('plus')} Add by hand</button></div>
        ${history.length ? `<ol class="feed flat">${history.slice(0, 12).map((x) => itemRow(data, x, now, false)).join('')}</ol>
          ${history.length > 12 ? `<button class="btn btn-small" data-act="see-activity" data-id="${sid}">See all ${history.length} in Activity</button>` : ''}`
          : '<p class="muted">Nothing yet. What it buys, books or emails will be listed here.</p>'}
      </section>

      <section class="card">
        <h2>Name</h2>
        <form data-form="rename" data-id="${sid}" class="inline-form">
          <input name="name" id="rename-value" aria-label="Assistant name" value="${esc(a.name)}" required maxlength="40" autocomplete="off">
          <button class="btn btn-small">Save name</button>
        </form>
        <h2>Remove</h2>
        <p class="muted small">Its history stays in your record and in your saved copy, marked as removed.</p>
        <button class="btn btn-small btn-danger" data-act="remove-assistant" data-id="${sid}">${icon('trash')} Remove ${esc(a.name)}</button>
      </section>
    </div>`;
}
