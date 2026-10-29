// node tests/m09_labs.js — drives the Mission 09 labs (Be the UNO, byte lab, segment encoder, reaction tester)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?preview=1#/m/m09/3'); await p.waitForTimeout(700);
  const lab = p.locator('.xp', { hasText: 'Be the UNO' }).last(); await lab.scrollIntoViewIfNeeded();
  const ds = lab.locator('button', { hasText: 'DS (pin 8)' }), ck = lab.locator('button', { hasText: 'Clock tick' }), lt = lab.locator('button', { hasText: 'Latch' });
  for (const bit of [1, 1, 0, 0, 0, 0, 0, 1]) { const on = (await ds.innerText()).includes('HIGH'); if (on !== !!bit) await ds.click(); await ck.click(); await p.waitForTimeout(420); }
  await lt.click(); await p.waitForTimeout(300);
  console.log('be the uno:', (await lab.locator('.readouts').innerText()).replace(/\s+/g, ' '));
  await lab.screenshot({ path: 'tests/out/m09-lab-uno.png' });
  await p.goto('http://localhost:8765/index.html?preview=1#/m/m09/2'); await p.waitForTimeout(700);
  const bl = p.locator('.xp', { hasText: 'The byte lab' }); await bl.scrollIntoViewIfNeeded();
  const leds = bl.locator('svg g.sim-btn'); await leds.nth(5).click(); await leds.nth(7).click(); // bits 2 and 0
  console.log('byte lab:', (await bl.locator('.readouts').first().innerText()).replace(/\s+/g, ' '));
  await p.goto('http://localhost:8765/index.html?preview=1#/m/m09/6'); await p.waitForTimeout(700);
  const sl = p.locator('.xp', { hasText: 'The segment encoder' }); await sl.scrollIntoViewIfNeeded();
  const segs = sl.locator('svg polygon.sim-btn'); for (const i of [0, 1, 2]) await segs.nth(i).click();
  console.log('segment lab:', (await sl.locator('svg').innerHTML()).match(/THAT’S A \d[^<]*/)?.[0], '|', (await sl.locator('.readouts').innerText()).replace(/\s+/g, ' '));
  await p.goto('http://localhost:8765/index.html?preview=1#/m/m09/8'); await p.waitForTimeout(700);
  const rl = p.locator('.xp', { hasText: 'The reaction tester' }); await rl.scrollIntoViewIfNeeded();
  const pad = rl.locator('svg'); await pad.click(); await p.waitForTimeout(300); await pad.click();
  console.log('reaction early:', (await pad.innerHTML()).includes('TOO SOON'));
  await pad.click(); await p.waitForFunction(() => document.querySelector('.step-b').innerHTML.includes('CLICK!'), null, { timeout: 6000 }); await p.waitForTimeout(240); await pad.click();
  console.log('reaction:', (await rl.locator('.readouts').innerText()).replace(/\s+/g, ' '));
  console.log('page errors:', errs.length, errs.join(' | '));
  await b.close();
})();
