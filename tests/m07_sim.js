// node tests/m07_sim.js — runs every Mission 07 Virtual UNO check: provided code (PASS), broken code (RETRY), your-turn template + hint
const { chromium } = require('playwright');
const STEP = { ir: 3, step: 6, remote: 7, final: 8 };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('pageerror:', e.message); });
  p.on('dialog', d => d.accept());
  async function run(step, label, edit, wait, expect) {
    await p.goto('http://localhost:8765/index.html?preview=1#/m/m07/' + step); await p.waitForTimeout(500);
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await p.reload(); await p.waitForTimeout(600);
    const sim = p.locator('.sim').first(); await sim.scrollIntoViewIfNeeded();
    const ta = sim.locator('textarea');
    if (edit) { const code = await ta.inputValue(); const nc = edit(code); if (nc === code) console.log('  (edit did nothing!)'); await ta.fill(nc); }
    await sim.locator('text=Check my code').click();
    await p.waitForTimeout(wait);
    const msg = (await sim.locator('.sim-msg').innerText()).replace(/\s+/g, ' ');
    const ok = expect === 'PASS' ? /^PASS/.test(msg) : /^RETRY|Compile error|Error/.test(msg);
    console.log((ok ? 'ok   ' : 'FAIL ') + label + ' → ' + msg.slice(0, 220));
    const ser = await sim.locator('.sim-serial').innerText(); if (ser.trim()) console.log('     serial: ' + ser.trim().split('\n').slice(-4).join(' | '));
    if (label.indexOf('provided') >= 0) await sim.screenshot({ path: 'tests/out/m07-check-' + step + '.png' });
    return ok;
  }
  let all = true;
  all &= await run(STEP.ir, 'ir provided', null, 2200, 'PASS');
  all &= await run(STEP.ir, 'ir broken (decimal, not HEX)', c => c.replace('Serial.println(code, HEX);', 'Serial.println(code);'), 2200, 'RETRY');
  all &= await run(STEP.step, 'step provided', null, 5200, 'PASS');
  all &= await run(STEP.step, 'step broken (no return)', c => c.replace('motor.step(-512);', 'motor.step(512);'), 5200, 'RETRY');
  all &= await run(STEP.remote, 'remote template', null, 3600, 'RETRY');
  const hint = c => c.replace('      // YOUR TURN: case 0x44 (the |<< button) turns 45 degrees the other way\n', '      case 0x44:                     // the |<< button: anticlockwise\n        Serial.println("Anticlockwise 45");\n        motor.step(-STEPS_45);\n        break;\n');
  all &= await run(STEP.remote, 'remote with hint', hint, 3600, 'PASS');
  all &= await run(STEP.final, 'final provided', null, 8000, 'PASS');
  all &= await run(STEP.final, 'final broken (long way round)', c => c.replace('  if (change > STEPS_PER_REV / 2) change = change - STEPS_PER_REV;    // over half a turn?\n', ''), 9000, 'RETRY');
  console.log(all ? 'ALL OK' : 'SOME FAILED', errs.length ? 'PAGE ERRORS ' + errs.length : 'no page errors');
  await b.close();
})();
