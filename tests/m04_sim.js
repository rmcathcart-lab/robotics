// node tests/m04_sim.js — runs every Mission 04 Virtual UNO "Check my code" with the given code (PASS) and broken code (RETRY)
const { chromium } = require('playwright');
const M = 'm04';
async function run(browser, step, edit, label, shot) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${step}`); await p.waitForTimeout(700);
  const sim = p.locator('.sim').first(); const ta = sim.locator('textarea');
  if (edit) { const code = await ta.inputValue(); const next = edit(code); if (next === code) console.log('  !! edit did not change the code for', label); await ta.fill(next); }
  await sim.scrollIntoViewIfNeeded();
  await sim.locator('text=Check my code').click();
  let msg = '';
  for (let i = 0; i < 70; i++) { await p.waitForTimeout(500); msg = await sim.locator('.sim-msg').innerText(); if (/PASS|RETRY|error/i.test(msg)) break; }
  const serial = await sim.locator('.sim-serial').innerText();
  if (shot) await sim.screenshot({ path: `tests/out/${M}-sim-${shot}.png` });
  console.log(`[${label}] ${msg.replace(/\s+/g, ' ').slice(0, 220)}`);
  if (serial.trim()) console.log('   serial: ' + serial.trim().split('\n').slice(-3).join(' | ').slice(0, 220));
  if (errs.length) console.log('   PAGE ERRORS:', errs);
  await ctx.close();
  return msg;
}
(async () => {
  const b = await chromium.launch();
  const R = [];
  const expect = async (want, ...a) => { const m = await run(b, ...a); const ok = new RegExp(want).test(m); R.push([a[2], ok]); };
  await expect('PASS', 4, null, 'sweep: given code', 'sweep');
  await expect('RETRY', 4, c => c.replace('angle <= 180', 'angle <= 90').replace('angle = 180', 'angle = 90'), 'sweep: half sweep');
  await expect('PASS', 5, null, 'dht: given code', 'dht');
  await expect('RETRY', 5, c => c.replace('  Serial.print(humidity, 0);\n', ''), 'dht: no humidity');
  await expect('RETRY', 6, null, 'needle: template');
  const done = c => c.replace('  int angle = 90;', '  int angle = map(temperature, LOW_TEMP, HIGH_TEMP, 0, 180);\n  angle = constrain(angle, 0, 180);');
  await expect('PASS', 6, done, 'needle: hint answer', 'needle');
  await expect('RETRY', 6, c => c.replace('  int angle = 90;', '  int angle = map(temperature, LOW_TEMP, HIGH_TEMP, 0, 180);'), 'needle: no constrain');
  await expect('RETRY', 6, c => c.replace('  int angle = 90;', '  int angle = map(temperature, 0, 180, LOW_TEMP, HIGH_TEMP);\n  angle = constrain(angle, 0, 180);'), 'needle: map backwards');
  await expect('PASS', 7, null, 'thermistor: given code', 'therm');
  await expect('RETRY', 7, c => c.replace('return kelvin - 273.15;', 'return kelvin;'), 'thermistor: kelvin');
  await expect('PASS', 8, null, 'calibration: given code', 'calib');
  await expect('PASS', 9, null, 'gauge: given code', 'gauge');
  await expect('RETRY', 9, c => c.replace('    showHumidity = !showHumidity;\n', ''), 'gauge: no mode flip');
  console.log('\nSUMMARY'); R.forEach(r => console.log((r[1] ? 'ok   ' : 'FAIL ') + r[0]));
  await b.close();
})();
