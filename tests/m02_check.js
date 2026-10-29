// node tests/m02_check.js — Mission 02: build guides to the last step (screenshots), every Virtual UNO check
// with the provided code (expect PASS) and a broken version (expect RETRY), plus the your-turn template.
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/index.html?preview=1#/m/m02/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', e => { errs.push(e.message); console.log('pageerror:', e.message); });
  p.on('dialog', d => d.accept());
  async function go(step) { await p.goto('about:blank'); await p.goto(URL + step); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank'); await p.goto(URL + step); await p.waitForTimeout(900); }
  async function guide(step, idx, name) {
    await go(step);
    const g = p.locator('.bg').nth(idx); await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
    const n = Number((await g.locator('.bg-ctl .label').innerText()).split('/')[1]);
    for (let i = 1; i < n; i++) { await g.locator('text=Next →').click(); await p.waitForTimeout(350); }
    await p.waitForTimeout(1400); await g.screenshot({ path: `tests/out/m02-${name}-last.png` });
    // whole-board view of the final step
    await g.locator('.bg-zoom button').click(); await p.waitForTimeout(900); await g.screenshot({ path: `tests/out/m02-${name}-whole.png` });
  }
  async function check(step, idx, label, edit, wait) {
    await go(step);
    const sim = p.locator('.sim').nth(idx); await sim.scrollIntoViewIfNeeded();
    if (edit) { const ta = sim.locator('textarea'); const code = await ta.inputValue(); const nc = edit(code); if (nc === code) console.log('  !! edit did not change the code for', label); await ta.fill(nc); }
    await sim.locator('text=Check my code').click();
    await p.waitForTimeout(wait);
    const msg = (await sim.locator('.sim-msg').innerText()).replace(/\s+/g, ' ');
    console.log(label.padEnd(34), '→', msg.slice(0, 170));
    return sim;
  }
  await guide(4, 0, 'guide-rgb');
  await guide(6, 0, 'guide-sensors');
  // step 4: colour mixer (your turn: purple)
  await check(4, 0, 'mix template (expect RETRY)', null, 9500);
  let s = await check(4, 0, 'mix + purple (expect PASS)', c => c.replace('  // YOUR TURN: mix purple (red + blue) and show it for 1 second\n', '  setColor(255, 0, 255);\n  delay(1000);\n'), 9500);
  await s.screenshot({ path: 'tests/out/m02-sim-mix.png' });
  await check(4, 0, 'mix, missing ; (expect error)', c => c.replace('delay(8);', 'delay(8)'), 1500);
  // step 6: read sensors
  s = await check(6, 0, 'read (expect PASS)', null, 3600);
  await s.screenshot({ path: 'tests/out/m02-sim-read.png' });
  await check(6, 0, 'read, wrong pin (expect RETRY)', c => c.replace('const int LIGHT = A1;', 'const int LIGHT = A2;'), 3600);
  // step 7: wheel
  s = await check(7, 0, 'wheel (expect PASS)', null, 2500);
  await check(7, 0, 'wheel, broken branch (expect RETRY)', c => c.replace('    blue = map(knob, 341, 681, 0, 255);', '    blue = 0;'), 2500);
  await go(7); { const sim = p.locator('.sim').first(); await sim.scrollIntoViewIfNeeded(); await sim.locator('text=Upload').click(); await p.waitForTimeout(400); await p.evaluate(() => {}); }
  // step 8: lamp
  s = await check(8, 0, 'lamp (expect PASS)', null, 2500);
  await s.screenshot({ path: 'tests/out/m02-sim-lamp.png' });
  await check(8, 0, 'lamp, no flip (expect RETRY)', c => c.replace('map(light, DARK, BRIGHT, 255, 10)', 'map(light, DARK, BRIGHT, 10, 255)'), 2500);
  console.log('page errors:', errs.length);
  await b.close();
})();
