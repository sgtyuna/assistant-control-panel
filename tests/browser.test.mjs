// Checks the real app in a real browser, at phone size and computer size.
// Needs Playwright once:  npm install -g playwright && npx playwright install chromium
// Run from the repo folder:  node tests/browser.test.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize } from 'node:path';

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
for (const [label, size] of [['phone', { width: 390, height: 844 }], ['computer', { width: 1280, height: 800 }]]) {
  console.log(`\n${label} (${size.width} wide)`);
  const ctx = await browser.newContext({ viewport: size });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const noSideScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const toastText = async () => (await page.locator('#toast').textContent()) || '';

  await page.goto(url);
  await page.waitForSelector('.chooser');
  check('first open asks which screen opens first', (await page.locator('#chooser-title').textContent()).includes('Which screen'));
  check('three choices, none marked as already picked',
    await page.locator('.choice').count() === 3 && await page.locator('.choice.is-current').count() === 0);
  check('nothing else shows until one is picked', await page.locator('#shell').isHidden());
  check('the keyboard starts inside the chooser', await page.evaluate(() => !!document.activeElement.closest('#chooser')));
  check('first open: no sideways scroll', await noSideScroll());

  await page.click('[data-home="activity"]');
  check('picking Activity opens Activity', await page.locator('#view').getAttribute('data-tab') === 'activity');
  check('with Demo mode off the screen is empty and says so', (await page.locator('.empty h2').textContent()).includes('No activity yet'));
  check('no Demo strip while Demo mode is off', await page.locator('#demo-strip').isHidden());

  await page.click('.empty [data-action="toggle-demo"]');
  await page.waitForSelector('.feed');
  check('Demo mode is clearly marked', await page.locator('#demo-strip').isVisible());
  check('Activity lists all 23 sample actions', await page.locator('.feed .item').count() === 23);
  check('Activity is newest first', await page.evaluate(() => {
    const first = document.querySelector('.feed .item .line .muted').textContent;
    return first.startsWith('Today') || first.startsWith('Yesterday');
  }));
  check('actions that can still be undone say until when', await page.locator('.mark-undo').count() === 5);
  check('Activity: no sideways scroll', await noSideScroll());

  await page.click('[data-filter="flagged"]');
  check('Flagged only shows the 3 flagged actions', await page.locator('.feed .item').count() === 3);
  await page.click('[data-filter="flagged"]');
  await page.click('[data-filter="kind"][data-value="booked"]');
  check('Booked shows the 6 bookings', await page.locator('.feed .item').count() === 6);
  await page.selectOption('#f-assistant', 'siri');
  check('Booked + Siri shows 1', await page.locator('.feed .item').count() === 1);
  await page.selectOption('#f-assistant', 'grok');
  check('filters with no match say so', await page.locator('.empty h2').textContent() === 'Nothing matches');
  await page.click('[data-filter="clear"]');
  check('Show everything brings all 23 back', await page.locator('.feed .item').count() === 23);

  await page.click('#nav a[href="#ok"]');
  await page.waitForFunction(() => document.getElementById('view').dataset.tab === 'ok');
  check('Needs your OK shows 5 waiting', (await page.locator('#nav .count').textContent()).trim() === '5');
  check('Needs your OK: no sideways scroll', await noSideScroll());
  await page.locator('#view [data-inert]').first().click();
  check('OK / No say they start working next stage', (await toastText()).includes('next stage'));

  await page.click('#nav a[href="#assistants"]');
  await page.waitForFunction(() => document.getElementById('view').dataset.tab === 'assistants');
  check('Assistants shows the 9 sample assistants', (await page.locator('#view').textContent()).includes('Perplexity') &&
    (await page.locator('#view').textContent()).includes('Meta AI'));
  check('Assistants: no sideways scroll', await noSideScroll());
  await page.click('#pause-all');
  check('Pause Everything says it starts working next stage', (await toastText()).includes('next stage'));

  await page.click('#nav a[href="#more"]');
  await page.waitForFunction(() => document.getElementById('view').dataset.tab === 'more');
  check('More: no sideways scroll', await noSideScroll());
  await page.click('[data-action="choose-home"]');
  check('Change reopens the chooser with the current pick marked', await page.locator('.choice.is-current').count() === 1);
  check('the keyboard moves into the chooser', await page.evaluate(() => !!document.activeElement.closest('#chooser')));
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  check('Tab stays inside the chooser', await page.evaluate(() => !!document.activeElement.closest('#chooser')));
  await page.keyboard.press('Escape');
  check('Escape closes it and nothing changes', await page.locator('.chooser').count() === 0 &&
    (await page.locator('#view').textContent()).includes('Activity feed'));
  await page.click('[data-action="choose-home"]');
  await page.click('[data-home="assistants"]');
  check('the home screen can be changed', await page.locator('#view').getAttribute('data-tab') === 'assistants');

  await page.reload();
  await page.waitForSelector('#nav a');
  check('the home screen and Demo mode are remembered', await page.locator('#view').getAttribute('data-tab') === 'assistants' &&
    await page.locator('#demo-strip').isVisible());
  const stored = await page.evaluate(() => localStorage.getItem('acp.myInfo'));
  check('sample data is not saved into my information', !stored.includes('Fernhill') && JSON.parse(stored).assistants.length === 0);

  await page.click('#demo-strip [data-action="toggle-demo"]');
  await page.waitForSelector('.empty');
  check('turning Demo mode off empties the screens again', await page.locator('#demo-strip').isHidden());
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
