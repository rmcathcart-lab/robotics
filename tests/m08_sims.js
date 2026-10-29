// node tests/m08_sims.js — runs every Mission 08 Virtual UNO check: provided code → PASS, broken code → RETRY, your-turn + hint → PASS
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765/index.html?preview=1#/m/m08/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('pageerror:', e.message); });
  p.on('dialog', d => d.accept());
  async function check(step, label, edit, wait) {
    await p.goto('about:blank'); await p.goto(BASE + step); await p.waitForTimeout(700);
    const sim = p.locator('.sim').first(); await sim.scrollIntoViewIfNeeded();
    const ta = sim.locator('textarea'); let code = await ta.inputValue();
    if (edit) { code = edit(code); await ta.fill(code); }
    await sim.locator('text=Check my code').click();
    const t0 = Date.now(); let msg = '';
    while (Date.now() - t0 < wait) { await p.waitForTimeout(500); msg = await sim.locator('.sim-msg').innerText(); if (/PASS|RETRY|error/i.test(msg) && !/Checking/.test(msg)) break; }
    const ser = (await sim.locator('.sim-serial').innerText()).trim().split('\n').slice(-3).join(' | ');
    console.log(`[${label}] ${msg.replace(/\s+/g, ' ')}\n    serial: ${ser}`);
    await sim.screenshot({ path: `tests/out/m08-sim-${label}.png` });
    await sim.locator('.sim-ctl button', { hasText: 'Stop' }).click(); await ta.fill(''); await p.waitForTimeout(900); // clear saved edits
  }
  await check(5, 'spin', null, 15000);
  await check(5, 'spin-broken', c => c.replace('digitalWrite(IN2, HIGH);      // OUT1 = GND, OUT2 = +', 'digitalWrite(IN2, LOW);'), 15000);
  await check(6, 'knob-template', null, 6000);
  await check(6, 'knob-done', c => c.replace('  // YOUR TURN: use map() to turn knob (0 to 1023) into speed (0 to 255)\n', '  speed = map(knob, 0, 1023, 0, 255);\n'), 6000);
  await check(6, 'knob-wrong', c => c.replace('  // YOUR TURN: use map() to turn knob (0 to 1023) into speed (0 to 255)\n', '  speed = map(knob, 0, 1023, 255, 0);\n'), 6000);
  await check(7, 'click', null, 12000);
  await check(7, 'click-broken', c => c.replace('analogWrite(ENABLE, 200);', 'analogWrite(ENABLE, 0);'), 12000);
  await check(8, 'auto', null, 15000);
  await check(8, 'auto-single', c => c.replace('fanOn && temp < OFF_TEMP', 'fanOn && temp < ON_TEMP'), 15000);
  await check(9, 'smart', null, 18000);
  await check(9, 'smart-broken', c => c.replace('if (hot && temp < OFF_TEMP) hot = false;', 'if (hot && temp < ON_TEMP) hot = false;'), 18000);
  console.log('page errors:', errs.length);
  await b.close();
})();
