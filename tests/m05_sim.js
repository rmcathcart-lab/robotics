// node tests/m05_sim.js — runs every Mission 05 Virtual UNO "Check my code" with the given code (PASS) and broken code (RETRY)
const { chromium } = require('playwright');
const M = 'm05';
async function run(browser, step, simIndex, edit, label, shot) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${step}`); await p.waitForTimeout(700);
  const sim = p.locator('.sim').nth(simIndex); const ta = sim.locator('textarea');
  if (edit) { const code = await ta.inputValue(); const next = edit(code); if (next === code) console.log('  !! edit did not change the code for', label); await ta.fill(next); }
  await sim.scrollIntoViewIfNeeded();
  await sim.locator('text=Check my code').click();
  let msg = '';
  for (let i = 0; i < 70; i++) { await p.waitForTimeout(500); msg = await sim.locator('.sim-msg').innerText(); if (/PASS|RETRY|error/i.test(msg)) break; }
  const serial = await sim.locator('.sim-serial').innerText();
  const logLen = await p.evaluate(() => 0);
  if (shot) await sim.screenshot({ path: `tests/out/${M}-sim-${shot}.png` });
  console.log(`[${label}] ${msg.replace(/\s+/g, ' ').slice(0, 240)}`);
  if (serial.trim()) console.log('   serial: ' + serial.trim().split('\n').slice(-3).join(' | ').slice(0, 200));
  if (errs.length) console.log('   PAGE ERRORS:', errs);
  await ctx.close();
  return msg;
}
const ANSWER = [
  '    if (now - lastBeep >= gap) {',
  '      lastBeep = now;',
  '      setBuzzer(true);',
  '    }',
  '    if (now - lastBeep >= BEEP_MS) {',
  '      setBuzzer(false);',
  '    }'].join('\n');
function fill(c) { return c.replace(/    \/\/ YOUR TURN: if at least[^\n]*\n[^\n]*\n\n    \/\/ YOUR TURN: once[^\n]*\n/, ANSWER + '\n'); }
(async () => {
  const b = await chromium.launch();
  const R = [];
  const expect = async (want, ...a) => { const m = await run(b, ...a); R.push([a[3], new RegExp(want).test(m)]); };
  await expect('PASS', 4, 0, null, 'distance: given code', 'dist');
  await expect('RETRY', 4, 0, c => c.replace('duration / 58', 'duration / 29'), 'distance: wrong maths');
  await expect('PASS', 5, 0, null, 'zones: given code', 'zones');
  await expect('RETRY', 5, 0, c => c.replace('} else if (cm > NEAR_CM) {', '} else if (cm > 5) {'), 'zones: wrong boundary');
  await expect('RETRY', 6, 1, null, 'beeper: template');
  await expect('PASS', 6, 1, fill, 'beeper: hint answer', 'beeper');
  await expect('RETRY', 6, 1, c => fill(c).replace('    if (now - lastBeep >= gap) {', '    if (now - lastBeep >= 300) {'), 'beeper: fixed gap');
  await expect('RETRY', 6, 1, c => c.replace(/    \/\/ YOUR TURN: if at least[^\n]*\n[^\n]*\n\n    \/\/ YOUR TURN: once[^\n]*\n/, '    digitalWrite(BUZZER, HIGH);\n    delay(BEEP_MS);\n    digitalWrite(BUZZER, LOW);\n    delay(gap);\n'), 'beeper: delay version');
  await expect('PASS', 7, 0, null, 'final: given code', 'final');
  await expect('RETRY', 7, 0, c => c.replace('  updateBeeper(now);\n', ''), 'final: no beeper');
  console.log('\nSUMMARY'); R.forEach(r => console.log((r[1] ? 'ok   ' : 'FAIL ') + r[0]));
  await b.close();
})();
