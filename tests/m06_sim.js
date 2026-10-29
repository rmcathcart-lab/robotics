// node tests/m06_sim.js — runs every Mission 06 Virtual UNO check: provided code (PASS), broken code (RETRY), your-turn template + hint
const { chromium } = require('playwright');
const STEP = { hello: 4, tilt: 5, answers: 6, thermo: 7, final: 8 };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('pageerror:', e.message); });
  p.on('dialog', d => d.accept());
  async function run(step, label, edit, wait, expect) {
    await p.goto('http://localhost:8765/index.html?preview=1#/m/m06/' + step); await p.waitForTimeout(500);
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await p.reload(); await p.waitForTimeout(600);
    const sim = p.locator('.sim').first(); await sim.scrollIntoViewIfNeeded();
    const ta = sim.locator('textarea');
    if (edit) { const code = await ta.inputValue(); const nc = edit(code); if (nc === code) console.log('  (edit did nothing!)'); await ta.fill(nc); }
    await sim.locator('text=Check my code').click();
    await p.waitForTimeout(wait);
    const msg = (await sim.locator('.sim-msg').innerText()).replace(/\s+/g, ' ');
    const ok = expect === 'PASS' ? /^PASS/.test(msg) : /^RETRY|Compile error|Error/.test(msg);
    console.log((ok ? 'ok   ' : 'FAIL ') + label + ' → ' + msg.slice(0, 200));
    const ser = await sim.locator('.sim-serial').innerText(); if (ser.trim()) console.log('     serial: ' + ser.trim().split('\n').slice(-3).join(' | '));
    return ok;
  }
  let all = true;
  all &= await run(STEP.hello, 'hello provided', null, 2600, 'PASS');
  all &= await run(STEP.hello, 'hello broken (no hello)', c => c.replace('  lcd.print("Hello, LCD!");     // starts at column 0, row 0\n', ''), 2600, 'RETRY');
  all &= await run(STEP.tilt, 'tilt provided', null, 2200, 'PASS');
  all &= await run(STEP.tilt, 'tilt broken (no else text)', c => c.replace('lcd.print("HIGH = tipped  ");', 'lcd.print("LOW  = upright ");'), 2200, 'RETRY');
  all &= await run(STEP.answers, 'answers template (4 answers)', null, 2500, 'RETRY');
  const hint = c => c.replace('  // YOUR TURN: add at least 4 answers of your own here\n\n', '  "Not today",\n  "Signs say yes",\n  "Very doubtful",\n  "Try a pizza",\n').replace('const int NUM_ANSWERS = 4;', 'const int NUM_ANSWERS = 8;');
  all &= await run(STEP.answers, 'answers with hint (8)', hint, 10500, 'PASS');
  all &= await run(STEP.answers, 'answers count mismatch', c => hint(c).replace('NUM_ANSWERS = 8;', 'NUM_ANSWERS = 6;'), 2500, 'RETRY');
  all &= await run(STEP.answers, 'answers no random', c => hint(c).replace('random(NUM_ANSWERS)', '0'), 10500, 'RETRY');
  all &= await run(STEP.thermo, 'thermo provided', null, 3500, 'PASS');
  all &= await run(STEP.thermo, 'thermo broken (Kelvin shown)', c => c.replace('lcd.print(tempC, 1);', 'lcd.print(tempK, 1);'), 3500, 'RETRY');
  all &= await run(STEP.final, 'final provided', null, 10500, 'PASS');
  all &= await run(STEP.final, 'final broken (no mode switch)', c => c.replace('millis() - tipStart > 2000', 'millis() - tipStart > 200000'), 10500, 'RETRY');
  console.log(all ? 'ALL OK' : 'SOME FAILED', errs.length ? 'PAGE ERRORS ' + errs.length : 'no page errors');
  await b.close();
})();
