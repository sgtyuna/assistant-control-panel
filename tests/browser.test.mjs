// Checks the real app in a real browser, at phone size and computer size.
// Needs Playwright once:  npm install -g playwright && npx playwright install chromium
// Run from the repo folder:  node tests/browser.test.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(root, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/html' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}

const browser = await chromium.launch();
const tmp = mkdtempSync(join(tmpdir(), 'acp-'));

for (const [label, size] of [['phone', { width: 390, height: 844 }], ['computer', { width: 1280, height: 800 }]]) {
  console.log(`\n${label} (${size.width} wide)`);
  const ctx = await browser.newContext({ viewport: size, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const noSideScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const toastText = async () => (await page.locator('#toast').textContent()) || '';
  const viewText = async () => (await page.locator('#view').textContent()) || '';
  const go = async (hash) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForFunction((h) => document.getElementById('view').dataset.tab === (h.startsWith('a-') ? 'detail' : h), hash);
  };
  const my = () => page.evaluate(() => JSON.parse(localStorage.getItem('acp.myInfo')));
  const tab = () => page.locator('#view').getAttribute('data-tab');
  const screens = async (tag) => {
    for (const h of ['ok', 'assistants', 'activity', 'money', 'week', 'alerts', 'settings', 'more']) {
      await go(h);
      check(`${tag}: ${h} has no sideways scroll`, await noSideScroll());
    }
  };
  // Add something by hand through the form.
  const addByHand = async ({ text, party = '', amount = '', category = '', mode = 'rules', undo = '0', flag = '', kind = 'bought', who = null }) => {
    await go('activity');
    await page.locator('#view [data-act="open-add"]').first().click();
    if (who) await page.selectOption('#add-assistant', { label: who });
    await page.selectOption('#add-kind', kind);
    await page.fill('#add-text', text);
    await page.fill('#add-party', party);
    await page.fill('#sheet [name="amount"]', String(amount));
    if (category) await page.selectOption('#add-category', { label: category });
    await page.selectOption('#add-undo', undo);
    await page.fill('#add-flag', flag);
    await page.selectOption('#add-mode', mode);
    await page.click('#sheet .btn-primary');
    return toastText();
  };

  // ---- First open ----
  await page.goto(url);
  await page.waitForSelector('.chooser');
  check('first open asks which screen opens first', (await page.locator('#chooser-title').textContent()).includes('Which screen'));
  check('three choices, none marked as already picked',
    await page.locator('.choice').count() === 3 && await page.locator('.choice.is-current').count() === 0);
  check('nothing else shows until one is picked', await page.locator('#shell').isHidden());
  check('the keyboard starts inside the chooser', await page.evaluate(() => !!document.activeElement.closest('#chooser')));
  check('first open: no sideways scroll', await noSideScroll());
  await page.click('[data-home="activity"]');
  check('picking Activity opens Activity', await tab() === 'activity');
  check('with nothing entered the screen says what goes there', (await page.locator('.empty h2').textContent()).includes('No activity yet'));
  await screens('empty');

  // ---- My own information ----
  await go('assistants');
  await page.click('.empty [data-act="open-add-assistant"]');
  await page.fill('#new-assistant-name', 'Robin');
  await page.fill('#sheet [name="perPurchase"]', '50');
  await page.fill('#sheet [name="perMonth"]', '300');
  await page.click('#sheet .btn-primary');
  await page.waitForFunction(() => document.getElementById('view').dataset.tab === 'detail');
  check('add an assistant of my own', (await viewText()).includes('Robin'));
  const robinHash = await page.evaluate(() => location.hash.slice(1));

  await page.fill('#view form[data-form="limits"] [name="perWeek"]', '120');
  await page.click('#view form[data-form="limits"] button');
  check('change a limit', (await my()).assistants[0].limits.perWeek === 120 && (await my()).assistants[0].limits.perPurchase === 50);

  await page.fill('#rule-value', '25');
  await page.click('#view form[data-form="add-rule"] button');
  check('add a rule', (await viewText()).includes('Ask me before anything over $25'));

  await page.fill('#trusted-value', 'Oak Street Books');
  await page.click('#view form[data-form="add-trusted"] button');
  await page.fill('#trusted-value', 'Both Lists Store');
  await page.click('#view form[data-form="add-trusted"] button');
  await page.fill('#blocked-value', 'Both Lists Store');
  await page.click('#view form[data-form="add-blocked"] button');
  check('edit the lists', (await my()).assistants[0].trusted.length === 2 && (await my()).assistants[0].blocked.length === 1);
  check('a store on both lists is called out as blocked', (await toastText()).includes('both lists'));

  await page.selectOption('#access-kind', 'card');
  await page.fill('#access-label', 'Card for one trip');
  await page.selectOption('#access-ends', '7');
  await page.click('#view form[data-form="add-access"] button');
  check('access that expires shows when it ends', (await viewText()).includes('Ends in 7 days'));

  await page.check('#aq-on');
  await page.fill('#aq-from', '00:00'); await page.fill('#aq-to', '23:59');
  await page.click('#view form[data-form="quiet"] button');
  check('quiet hours: all day makes it quiet now', (await page.locator('.detail-head').textContent()).includes('Quiet until'));
  await page.uncheck('#aq-on');
  await page.click('#view form[data-form="quiet"] button');
  check('quiet hours switched off puts it back on', (await page.locator('.detail-head .state').textContent()).trim() === 'On');

  await go('money');
  await page.click('[data-act="add-category"]');
  await page.fill('#cat-name', 'Books'); await page.fill('#sheet [name="monthlyBudget"]', '40');
  await page.click('#sheet .btn-primary');
  check('add a budget category', (await viewText()).includes('Books'));
  await page.click('[data-act="edit-category"]');
  await page.fill('#cat-name', 'Reading');
  await page.click('#sheet .btn-primary');
  check('rename a budget category', (await viewText()).includes('Reading') && !(await viewText()).includes('Books'));

  // ---- The behaviour rules ----
  let t = await addByHand({ text: 'Bought a novel', party: 'Oak Street Books', amount: 18, category: 'Reading', undo: '24' });
  check('a trusted store under its limits goes straight to Activity', t.includes('Added to Activity'));
  t = await addByHand({ text: 'Bought a box set', party: 'Oak Street Books', amount: 60, category: 'Reading' });
  check('a trusted store over its limit still has to ask me', t.includes('has to ask') && t.includes('$50 limit'));
  t = await addByHand({ text: 'Bought a gadget', party: 'Both Lists Store', amount: 5 });
  check('a store on both the trusted and blocked lists is blocked', t.startsWith('Blocked'));
  t = await addByHand({ text: 'Bought an atlas', party: 'Oak Street Books', amount: 30, category: 'Reading' });
  check('an approve-first rule (over $25) makes it ask', t.includes('has to ask') && t.includes('over $25'));
  check('an alert shows inside the app', await page.locator('#alert-banner').isVisible());

  await go('ok');
  check('Needs your OK lists the 2 waiting', await page.locator('.request').count() === 2);
  const spent = async () => page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('acp.myInfo'));
    return d.actions.filter((a) => a.status === 'done').reduce((s, a) => s + a.amount, 0);
  });
  check('before any answer, only the first purchase counts', await spent() === 18);
  await page.locator('.request', { hasText: 'atlas' }).locator('[data-act="approve"]').click();
  check('tap OK: it moves to Activity and counts', await spent() === 48 && await page.locator('.request').count() === 1);
  await page.locator('.request [data-act="decline"]').click();
  check('tap No: it counts against nothing', await spent() === 48 && await page.locator('.request').count() === 0);
  await go('money');
  check('OK counts toward the budget; over budget is marked', (await viewText()).includes('$48.00') && (await viewText()).includes('Over by $8.00'));
  await go('activity');
  check('the No stays in the history, marked declined', (await viewText()).includes('You said No'));
  check('the blocked attempt is in the history', (await viewText()).includes('Blocked. Nothing happened'));

  await page.click('[data-filter="tab"][data-value="undo"]');
  check('the Undo tab lists what can still be undone, with a deadline', await page.locator('.feed .item').count() === 1 && (await viewText()).includes('Undo by'));
  await page.click('.feed [data-act="undo"]');
  check('undo takes the amount back out of the totals', await spent() === 30);
  await page.click('[data-filter="tab"][data-value="all"]');
  check('the undone action stays in the feed', (await viewText()).includes('Undone. The money is back out'));
  await go('money');
  check('the budget matches the feed after undo', (await viewText()).includes('$30.00') && !(await viewText()).includes('Over by'));
  await go('week');
  check('Weekly summary shows what it did and spent', (await viewText()).includes('Robin') && (await viewText()).includes('$30.00'));

  // ---- Both kinds of pause ----
  await go('assistants');
  await page.click('[data-act="open-add-assistant"]');
  await page.fill('#new-assistant-name', 'Wren');
  await page.click('#sheet .btn-primary');
  await go('assistants');
  const cardState = (name) => page.locator('.assistant', { hasText: name }).locator('.state').first().textContent();
  await page.locator('.assistant', { hasText: 'Wren' }).locator('[data-act="toggle-pause"]').click();
  check('pause one assistant', (await cardState('Wren')).trim() === 'Paused' && (await cardState('Robin')).trim() === 'On');
  t = await addByHand({ text: 'Bought tea', party: 'Corner Shop', amount: 4, who: 'Wren' });
  check('a paused assistant is stopped', t.startsWith('Stopped'));
  await page.click('#pause-all');
  await go('assistants');
  check('Pause Everything is obvious', (await page.locator('#topbar').textContent()).includes('Everything is paused') &&
    (await cardState('Robin')).includes('Paused with everything'));
  t = await addByHand({ text: 'Bought a pen', party: 'Oak Street Books', amount: 3 });
  check('nothing gets through while everything is paused', t.includes('Everything is paused'));
  await page.reload(); await page.waitForSelector('#nav a');
  check('Pause Everything is remembered', (await page.locator('#topbar').textContent()).includes('Everything is paused'));
  await page.click('#pause-all');
  await go('assistants');
  check('resume puts each assistant back as it was', (await cardState('Robin')).trim() === 'On' && (await cardState('Wren')).trim() === 'Paused');

  // ---- Home screen, then reload ----
  await go('settings');
  await page.click('[data-act="choose-home"]');
  check('Change reopens the chooser with the current pick marked', await page.locator('.choice.is-current').count() === 1);
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  check('Tab stays inside the chooser', await page.evaluate(() => !!document.activeElement.closest('#chooser')));
  await page.keyboard.press('Escape');
  check('Escape closes it and nothing changes', await page.locator('.chooser').count() === 0 && (await my()).settings.homeScreen === 'activity');
  await page.click('[data-act="choose-home"]');
  await page.click('[data-home="assistants"]');
  await page.goto(url); await page.waitForSelector('#nav a');
  const kept = await my();
  check('after a reload it all stuck', await tab() === 'assistants' && kept.assistants.length === 2 &&
    kept.assistants[0].limits.perWeek === 120 && kept.assistants[0].rules.length === 1 && kept.assistants[1].paused === true &&
    kept.actions.length === 6 && kept.categories[0].name === 'Reading');
  await screens('my information');
  await go(robinHash);
  check('assistant detail: no sideways scroll', await noSideScroll());

  // ---- Shell and information stay apart ----
  await go('settings');
  await page.click('#view [data-act="toggle-demo"]');
  await page.waitForSelector('#demo-strip:not([hidden])');
  await go('assistants');
  check('Demo mode shows the 10 sample assistants', await page.locator('.assistant').count() === 10);
  check('my information never shows up in Demo mode', !(await viewText()).includes('Robin'));
  await go('ok');
  check('Demo: 5 requests waiting', await page.locator('.request').count() === 5);
  await page.locator('.request [data-act="approve"]').first().click();
  await page.locator('.request [data-act="decline"]').first().click();
  check('Demo: OK and No work', await page.locator('.request').count() === 3);
  await go('assistants');
  await page.locator('.assistant', { hasText: 'Claude' }).locator('[data-act="toggle-pause"]').click();
  await page.reload(); await page.waitForSelector('#nav a');
  await go('assistants');
  check('Demo: changes are remembered between visits', (await cardState('Claude')).trim() === 'Paused');
  await go('activity');
  await page.click('[data-filter="tab"][data-value="undo"]');
  check('Demo: several things can still be undone', await page.locator('.feed .item').count() >= 4);
  await go('money');
  check('Demo: a category is over budget and subscriptions are listed', (await viewText()).includes('Over by') && (await viewText()).includes('Lumen Streaming'));
  await go('alerts');
  check('Demo: alerts are listed', await page.locator('.feed .item').count() >= 5);
  await screens('demo');
  await go('a-gemini');
  check('Demo detail shows limits, rules, lists and access', (await viewText()).includes('Saltbox Kitchen') && (await viewText()).includes('weekend'));
  check('Demo detail: no sideways scroll', await noSideScroll());
  await go('a-grok');
  check('Demo: one assistant has access about to expire', (await viewText()).includes('Ends in 2 days'));
  await go('settings');
  check('saving a copy is switched off in Demo mode', await page.locator('[data-act="save-copy"]').isDisabled() &&
    await page.locator('[data-act="load-copy"]').isDisabled());
  await page.click('[data-act="reset-demo"]'); await page.click('#confirm-ok');
  await page.waitForFunction(() => (document.getElementById('toast').textContent || '').includes('started'));
  await go('ok');
  check('Demo reset brings back the starting sample data', await page.locator('.request').count() === 5);
  const mid = JSON.stringify(await my());
  check('sample data never got into my information', !mid.includes('Fernhill') && !mid.includes('Gemini') && (await my()).assistants.length === 2);
  await page.click('#demo-strip [data-act="toggle-demo"]');
  await page.waitForSelector('#demo-strip', { state: 'hidden' });
  check('turning Demo mode off leaves no sample data behind', await page.evaluate(() => localStorage.getItem('acp.demo') === null));
  await go('assistants');
  check('my information is back, unchanged', await page.locator('.assistant').count() === 2 && (await viewText()).includes('Robin'));

  // ---- Remove an assistant ----
  await go('settings');
  await page.locator('.rows li', { hasText: 'Robin' }).locator('[data-act="remove-assistant"]').click();
  await page.click('#confirm-ok');
  await go('activity');
  await page.click('[data-filter="tab"][data-value="all"]');
  check("a removed assistant's history is still there, marked as removed", (await viewText()).includes('Robin (removed)'));

  // ---- Save, erase, load ----
  await go('settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="save-copy"]')]);
  const file = join(tmp, `${label}.json`);
  await dl.saveAs(file);
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  check('the saved file is one JSON file with a version number', saved.schemaVersion === 2 && saved.app === 'assistant-control-panel');
  check('the removed assistant is in the saved copy, marked as removed', saved.info.assistants.find((a) => a.name === 'Robin').removed === true &&
    saved.info.actions.length === 6);
  const before = JSON.stringify(await my());
  await page.click('[data-act="erase-my"]'); await page.click('#confirm-ok');
  await page.waitForSelector('.chooser');
  check('erase clears my information', await page.evaluate(() => localStorage.getItem('acp.myInfo') === null));
  await page.setInputFiles('#load-file', file);
  await page.waitForSelector('#nav a');
  check('load it back: everything returned', JSON.stringify(await my()) === before);

  const newer = join(tmp, `${label}-newer.json`);
  writeFileSync(newer, JSON.stringify({ ...saved, schemaVersion: 99 }));
  await page.setInputFiles('#load-file', newer);
  await page.click('#confirm-ok');
  await page.waitForSelector('#confirm p');
  check('a file from a newer version is refused plainly', (await page.locator('#confirm').textContent()).includes('newer version'));
  await page.click('#confirm-ok');
  check('and nothing was changed', JSON.stringify(await my()) === before);

  check('no errors in the browser', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// A browser that refuses to store anything gets a plain warning.
{
  console.log('\nbrowser that will not keep information');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.click('[data-home="ok"]');
  check('a warning shows right away', await page.locator('#notice').isVisible() &&
    (await page.locator('#notice').textContent()).includes('will not let the app keep information'));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
