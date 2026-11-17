import { icon } from '../ui.js';

export function renderMore(data) {
  const unread = data.alerts.filter((n) => !n.read).length;
  const row = (href, ico, title, note) => `
    <a class="card link-card" href="#${href}">${icon(ico)}<div class="grow"><div class="who">${title}</div><div class="muted small">${note}</div></div>${icon('next')}</a>`;
  return `
    <header class="screen-head"><h1>More</h1></header>
    <div class="stack">
      ${row('week', 'week', 'Weekly summary', 'What each assistant did and spent this week')}
      ${row('alerts', 'alerts', 'Alerts', unread ? `${unread} new` : 'Nothing new')}
      ${row('settings', 'settings', 'Settings', 'Home screen, quiet hours, assistants, your saved copy, Demo mode')}
    </div>`;
}
