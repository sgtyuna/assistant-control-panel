// The fill-in forms. Each one posts to a handler in app.js by its data-form name.
import { esc, icon } from '../ui.js';
import { ruleText } from '../logic.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const amount = (name, value, label, hint = '') => `
  <label class="field"><span>${label}</span>
    <input name="${name}" type="number" min="0" step="0.01" inputmode="decimal" value="${value ?? ''}" placeholder="${hint}">
  </label>`;

export function limitFields(l = {}) {
  return `<div class="fields four">
    ${amount('perPurchase', l.perPurchase, 'One purchase', 'No limit')}
    ${amount('perDay', l.perDay, 'Per day', 'No limit')}
    ${amount('perWeek', l.perWeek, 'Per week', 'No limit')}
    ${amount('perMonth', l.perMonth, 'Per month', 'No limit')}
  </div>`;
}

export function quietFields(q, idp) {
  const days = (q && q.days) || [];
  return `
    <label class="check"><input type="checkbox" name="on" id="${idp}-on" ${q && q.on !== false ? 'checked' : ''}> <span>Quiet hours are on</span></label>
    <div class="fields two">
      <label class="field"><span>From</span><input type="time" name="from" id="${idp}-from" value="${esc((q && q.from) || '22:00')}" required></label>
      <label class="field"><span>Until</span><input type="time" name="to" id="${idp}-to" value="${esc((q && q.to) || '07:00')}" required></label>
    </div>
    <fieldset class="days"><legend>Which days it starts on (none picked means every day)</legend>
      ${DAYS.map((d, i) => `<label class="day"><input type="checkbox" name="days" value="${i}" ${days.includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}
    </fieldset>
    <p class="muted small">For a whole day, use 12:00 AM until 11:59 PM. Times use this device's clock.</p>`;
}

const sheet = (title, form, body, submit) => `
  <form class="dialog-body" data-form="${form}">
    <div class="row"><h2 class="grow">${title}</h2>
      <button type="button" class="icon-btn" data-act="close-sheet" aria-label="Close">${icon('x')}</button></div>
    ${body}
    <div class="actions"><button type="button" class="btn" data-act="close-sheet">Cancel</button>
      <button class="btn btn-primary">${submit}</button></div>
  </form>`;

export function addAssistantForm(ideas = [], data = null) {
  const have = new Set(((data && data.assistants) || []).filter((a) => !a.removed).map((a) => a.name.toLowerCase()));
  const picks = ideas.filter((n) => !have.has(n.toLowerCase()));
  return sheet('Add an assistant', 'add-assistant', `
    ${picks.length ? `<p class="label">Tap one, or type any name below</p>
    <div class="picks">${picks.map((n) => `<button type="button" class="pick" data-act="pick-name" data-value="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
    <label class="field"><span>Its name</span><input name="name" id="new-assistant-name" required maxlength="40" autocomplete="off" placeholder="The assistant's name"></label>
    <p class="label">Spending limits (leave blank for no limit)</p>
    ${limitFields()}
    <p class="muted small">You can add rules, lists and quiet hours on its own screen afterwards.</p>`, 'Add assistant');
}

export function addActionForm(data, presetId, mode) {
  const list = data.assistants.filter((a) => !a.removed);
  const first = list.find((a) => a.id === presetId) || list[0];
  const custom = list.flatMap((a) => (a.rules || []).filter((r) => r.type === 'custom').map((r) => ({ a, r })));
  return sheet('Add by hand', 'add-action', `
    <p class="muted small">Nothing is connected yet, so you can add something an assistant did or wants to do.</p>
    <div class="fields two">
      <label class="field"><span>Assistant</span><select name="assistantId" id="add-assistant" required>
        ${list.map((a) => `<option value="${esc(a.id)}" ${a === first ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Kind</span><select name="kind" id="add-kind">
        <option value="bought">Bought</option><option value="booked">Booked</option><option value="emailed">Emailed</option></select></label>
    </div>
    <label class="field"><span>What, in plain words</span><input name="text" id="add-text" required maxlength="140" autocomplete="off" placeholder="Bought printer paper from a store"></label>
    <div class="fields two">
      <label class="field"><span>Store or person</span><input name="party" id="add-party" maxlength="60" autocomplete="off"></label>
      ${amount('amount', '', 'Amount', '0.00')}
    </div>
    <div class="fields two">
      <label class="field"><span>Budget category</span><select name="category" id="add-category">
        <option value="">No category</option>${data.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Repeats</span><select name="repeats" id="add-repeats">
        <option value="">No</option><option value="month">Every month</option><option value="year">Every year</option></select></label>
    </div>
    <div class="fields two">
      <label class="field"><span>Can be undone for</span><select name="undoHours" id="add-undo">
        <option value="0">Not at all</option><option value="24">1 day</option><option value="168">7 days</option><option value="720">30 days</option></select></label>
      <label class="field"><span>Unusual? Give a one-line reason</span><input name="flag" id="add-flag" maxlength="100" autocomplete="off" placeholder="Leave blank if not"></label>
    </div>
    ${custom.length ? `<fieldset class="days" data-rules ${custom.some(({ a }) => a === first) ? '' : 'hidden'}><legend>Does one of your written rules apply?</legend>
      ${custom.map(({ a, r }) => `<label class="check" data-for="${esc(a.id)}" ${a === first ? '' : 'hidden'}><input type="checkbox" name="ruleIds" value="${esc(r.id)}"> <span>${esc(ruleText(r))}</span></label>`).join('')}
    </fieldset>` : ''}
    <label class="field"><span>How it comes in</span><select name="mode" id="add-mode">
      <option value="rules" ${mode === 'ask' ? '' : 'selected'}>Let my rules decide</option>
      <option value="ask" ${mode === 'ask' ? 'selected' : ''}>Put it in Needs your OK</option>
      <option value="done">It already happened: put it straight in Activity (rules are skipped)</option></select></label>`, 'Add');
}

export function categoryForm(cat) {
  return sheet(cat ? 'Change a category' : 'Add a budget category', 'category', `
    <input type="hidden" name="id" value="${esc(cat ? cat.id : '')}">
    <label class="field"><span>Name</span><input name="name" id="cat-name" required maxlength="40" autocomplete="off" value="${esc(cat ? cat.name : '')}"></label>
    ${amount('monthlyBudget', cat ? cat.monthlyBudget : '', 'Budget per month', 'No budget')}`, cat ? 'Save' : 'Add category');
}

export function subscriptionForm(data) {
  const list = data.assistants.filter((a) => !a.removed);
  const next = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return sheet('Add a repeating charge', 'subscription', `
    <label class="field"><span>Started by</span><select name="assistantId" id="sub-assistant" required>
      ${list.map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></label>
    <label class="field"><span>What it is</span><input name="name" id="sub-name" required maxlength="60" autocomplete="off"></label>
    <div class="fields two">
      ${amount('amount', '', 'Amount', '0.00')}
      <label class="field"><span>Charged every</span><select name="every" id="sub-every"><option value="month">Month</option><option value="year">Year</option><option value="week">Week</option></select></label>
    </div>
    <label class="field"><span>Next charge date</span><input type="date" name="next" id="sub-next" value="${next}" required></label>`, 'Add');
}
