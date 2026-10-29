// node tests/m09_sims.js — runs every Mission 09 Virtual UNO check: provided code → PASS, broken code → RETRY, your-turn + hint → PASS
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765/index.html?preview=1#/m/m09/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('pageerror:', e.message); });
  p.on('dialog', d => d.accept());
  async function check(step, label, edit, wait, idx) {
    await p.goto('about:blank'); await p.goto(BASE + step); await p.waitForTimeout(700);
    const sim = p.locator('.sim').nth(idx || 0); await sim.scrollIntoViewIfNeeded();
    const ta = sim.locator('textarea'); let code = await ta.inputValue();
    if (edit) { code = edit(code); await ta.fill(code); }
    await sim.locator('text=Check my code').click();
    const t0 = Date.now(); let msg = '';
    while (Date.now() - t0 < wait) { await p.waitForTimeout(500); msg = await sim.locator('.sim-msg').innerText(); if (/PASS|RETRY|error/i.test(msg) && !/Checking/.test(msg)) break; }
    const ser = (await sim.locator('.sim-serial').innerText()).trim().split('\n').slice(-3).join(' | ');
    console.log(`[${label}] ${msg.replace(/\s+/g, ' ')}\n    serial: ${ser}`);
    await sim.screenshot({ path: `tests/out/m09-sim-${label}.png` });
    await sim.locator('.sim-ctl button', { hasText: 'Stop' }).click(); await ta.fill(''); await p.waitForTimeout(900); // clear saved edits
  }
  const KR = '  for (int i = 7; i >= 0; i--) {\n    show(1 << i);\n    delay(60);\n  }\n  for (int i = 1; i < 7; i++) {\n    show(1 << i);\n    delay(60);\n  }\n';
  await check(5, 'bar-template', null, 12000, 0);
  await check(5, 'bar-done', c => c.replace('  //    and back up again. Use show(1 << i) inside two for loops.\n', '  //    and back up again. Use show(1 << i) inside two for loops.\n' + KR), 12000, 0);
  await check(5, 'bar-oneway', c => c.replace('  //    and back up again. Use show(1 << i) inside two for loops.\n', '  for (int i = 7; i >= 0; i--) {\n    show(1 << i);\n    delay(60);\n  }\n'), 12000, 0);
  await check(5, 'count', null, 8000, 1);
  await check(5, 'count-broken', c => c.replace('count = (count + 1) % 256;', 'count = (count + 2) % 256;'), 8000, 1);
  await check(7, 'one', null, 8000, 0);
  await check(7, 'one-broken', c => c.replace('  digitalWrite(DIGIT_PINS[0], LOW);      // switch on digit 1 only\n', ''), 8000, 0);
  await check(7, 'multi-template', null, 8000, 1);
  await check(7, 'multi-done', c => c.replace('  // YOUR TURN: the tens, hundreds and thousands go in screen[2], [1] and [0]\n', '  screen[2] = DIGITS[n / 10 % 10];\n  screen[1] = DIGITS[n / 100 % 10];\n  screen[0] = DIGITS[n / 1000 % 10];\n'), 8000, 1);
  await check(7, 'multi-reversed', c => c.replace('  // YOUR TURN: the tens, hundreds and thousands go in screen[2], [1] and [0]\n', '  screen[0] = DIGITS[n / 10 % 10];\n  screen[1] = DIGITS[n / 100 % 10];\n  screen[2] = DIGITS[n / 1000 % 10];\n'), 8000, 1);
  await check(9, 'game', null, 20000, 0);
  await check(9, 'game-nofalse', c => c.replace('    if (p1 || p2) {                       // pressed before GO', '    if (false) {                       // pressed before GO'), 20000, 0);
  await check(9, 'game-wrongwinner', c => c.replace('(p1Time > 0 && p1Time <= p2Time)', '(p1Time > 0)'), 20000, 0);
  console.log('page errors:', errs.length);
  await b.close();
})();
